import base64
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

PREFIX_V1 = "enc:v1:"


class CryptoError(Exception):
    pass


class DecryptionError(CryptoError):
    pass


class SignatureVerificationError(CryptoError):
    pass


def _normalize_key(key: str | bytes, expected_length: int = 32) -> bytes:
    if isinstance(key, str):
        # Hex string
        if len(key) == expected_length * 2:
            try:
                return bytes.fromhex(key)
            except ValueError:
                pass
        # Raw or UTF-8 encoded, padded/hashed to required length
        return hashlib.sha256(key.encode("utf-8")).digest()
    return key[:expected_length]


class AESGCMCipher:
    """Field-level AES-256-GCM authenticated encryption for PII at rest."""

    def __init__(self, key: str | bytes):
        self._key = _normalize_key(key, 32)
        self._aesgcm = AESGCM(self._key)

    def encrypt(self, plaintext: str | None) -> str | None:
        if plaintext is None:
            return None
        if not plaintext:
            return ""
        try:
            nonce = os.urandom(12)  # 96-bit cryptographically secure random nonce
            data = plaintext.encode("utf-8")
            ciphertext = self._aesgcm.encrypt(nonce, data, None)
            payload = base64.b64encode(nonce + ciphertext).decode("ascii")
            return f"{PREFIX_V1}{payload}"
        except Exception as e:
            logger.error("AES-256-GCM encryption failure: %s", e)
            raise CryptoError(f"Encryption failed: {e}") from e

    def decrypt(self, ciphertext: str | None) -> str | None:
        if ciphertext is None:
            return None
        if not ciphertext or not ciphertext.startswith(PREFIX_V1):
            # Backward compatibility: unencrypted legacy records are returned as-is
            return ciphertext

        try:
            raw_payload = ciphertext[len(PREFIX_V1) :]
            raw_bytes = base64.b64decode(raw_payload)
            if len(raw_bytes) < 28:  # 12 nonce + 16 auth tag minimum
                raise DecryptionError("Ciphertext payload too short")

            nonce = raw_bytes[:12]
            actual_ciphertext = raw_bytes[12:]
            decrypted_bytes = self._aesgcm.decrypt(nonce, actual_ciphertext, None)
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.warning("AES-256-GCM decryption failed or corrupted tag: %s", e)
            raise DecryptionError(f"Decryption failed or invalid authentication tag: {e}") from e


class BlindIndex:
    """Deterministic HMAC-SHA256 blind index for O(1) encrypted field search."""

    def __init__(self, pepper: str | bytes):
        self._pepper = _normalize_key(pepper, 32)

    def compute(self, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return ""
        return hmac.new(self._pepper, normalized.encode("utf-8"), hashlib.sha256).hexdigest()


class HardwareHMAC:
    """HMAC-SHA256 device authentication and replay prevention for IoT hardware bridge."""

    def __init__(self, device_secret: str | bytes):
        self._secret = _normalize_key(device_secret, 32)

    def generate_signature(self, payload: bytes | str, timestamp: int) -> str:
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
        msg = payload + str(timestamp).encode("ascii")
        return hmac.new(self._secret, msg, hashlib.sha256).hexdigest()

    def verify(
        self,
        payload: bytes | str,
        timestamp: int,
        signature: str,
        max_drift_seconds: int = 120,
    ) -> bool:
        if not signature or not timestamp:
            return False

        # Replay attack prevention: verify timestamp freshness
        current_time = int(time.time())
        if abs(current_time - timestamp) > max_drift_seconds:
            logger.warning(
                "Hardware HMAC rejected: timestamp drift too large (%d vs %d, delta=%ds)",
                timestamp,
                current_time,
                abs(current_time - timestamp),
            )
            return False

        expected = self.generate_signature(payload, timestamp)
        return hmac.compare_digest(expected, signature)


class AuditChainer:
    """Tamper-evident cryptographic ledger linking consecutive security logs."""

    def __init__(self, audit_secret: str | bytes):
        self._secret = _normalize_key(audit_secret, 32)

    @staticmethod
    def canonical_json(data: dict[str, Any]) -> bytes:
        # Exclude dynamic signature/hash keys from canonical payload
        filtered = {
            k: v
            for k, v in data.items()
            if k not in ("signature", "chain_hash", "prev_hash")
        }
        return json.dumps(filtered, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")

    def sign_log(self, log_dict: dict[str, Any]) -> str:
        payload = self.canonical_json(log_dict)
        return hmac.new(self._secret, payload, hashlib.sha256).hexdigest()

    def compute_chain_hash(self, prev_hash: str | None, log_dict: dict[str, Any]) -> str:
        prev = prev_hash or "GENESIS_NODE_0000000000000000000000000000000000000000000000000000000000000000"
        canonical = self.canonical_json(log_dict)
        return hashlib.sha256(prev.encode("ascii") + canonical).hexdigest()

    def verify_entry(self, log_dict: dict[str, Any], prev_hash: str | None) -> bool:
        sig = log_dict.get("signature")
        if not sig:
            return False
        expected_sig = self.sign_log(log_dict)
        if not hmac.compare_digest(expected_sig, sig):
            return False

        recorded_hash = log_dict.get("chain_hash")
        if recorded_hash:
            expected_hash = self.compute_chain_hash(prev_hash, log_dict)
            if not hmac.compare_digest(expected_hash, recorded_hash):
                return False

        return True

    def verify_chain(self, logs: list[dict[str, Any]]) -> tuple[bool, str]:
        """Walk chronological log ledger (oldest to newest) to verify complete integrity."""
        if not logs:
            return True, "Ledger empty"

        prev_hash = None
        for idx, entry in enumerate(logs):
            recorded_prev = entry.get("prev_hash")
            if idx > 0 and recorded_prev and prev_hash and recorded_prev != prev_hash:
                return (
                    False,
                    f"Chain break at record index {idx} (ID: {entry.get('id')}): previous hash mismatch",
                )

            if not self.verify_entry(entry, prev_hash):
                return (
                    False,
                    f"Signature or tamper check failed at record index {idx} (ID: {entry.get('id')})",
                )

            prev_hash = entry.get("chain_hash") or self.compute_chain_hash(prev_hash, entry)

        return True, f"Cryptographic integrity verified across {len(logs)} ledger entries"
