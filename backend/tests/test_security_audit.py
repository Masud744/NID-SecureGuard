import os
import sys
import time
import pytest
from unittest.mock import MagicMock

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.crypto import (
    AESGCMCipher,
    BlindIndex,
    HardwareHMAC,
    AuditChainer,
    DecryptionError,
)
from core.security import (
    require_master_admin,
    require_approved_operator,
    require_station_or_operator,
)
from services.user_service import UserService
from fastapi import HTTPException


# --- 1. AES-256-GCM Field-Level Encryption Tests ---

def test_aes_gcm_encryption_roundtrip():
    key = "45256f2ee2e386c9123d8d52af55cc2675c1e1cfc2d65c7b5cfc726add48b994"
    cipher = AESGCMCipher(key)
    secret_text = "Citizen Confidential Phone: +8801700000000"

    encrypted = cipher.encrypt(secret_text)
    assert encrypted.startswith("enc:v1:"), "Ciphertext must have version prefix"
    assert encrypted != secret_text, "Ciphertext must not match plaintext"

    decrypted = cipher.decrypt(encrypted)
    assert decrypted == secret_text, "Decrypted text must match original plaintext"


def test_aes_gcm_tamper_detection():
    key = "45256f2ee2e386c9123d8d52af55cc2675c1e1cfc2d65c7b5cfc726add48b994"
    cipher = AESGCMCipher(key)
    encrypted = cipher.encrypt("Sensitive Address: Dhanmondi, Dhaka")

    # Tamper with the base64 ciphertext
    tampered = encrypted[:-4] + "AAAA"
    with pytest.raises(DecryptionError):
        cipher.decrypt(tampered)


def test_aes_gcm_legacy_backward_compatibility():
    cipher = AESGCMCipher("dummy-key-for-testing")
    legacy_plain = "Old Plaintext Address from v1.0"
    assert cipher.decrypt(legacy_plain) == legacy_plain


# --- 2. Deterministic Blind Indexing Tests ---

def test_blind_index_properties():
    pepper = "265c9fb39660f1cdf3dc17eb00616ab1c105c9243fd71c2f96449306657f4950"
    bi = BlindIndex(pepper)

    nid = "1998123456789"
    idx1 = bi.compute(nid)
    idx2 = bi.compute(f"  {nid}  ")

    assert idx1 == idx2, "Blind index must be whitespace-invariant"
    assert len(idx1) == 64, "Blind index must be a 256-bit hex digest"

    # Distinct values must have distinct indices
    assert bi.compute("1122334455667") != idx1


# --- 3. Hardware HMAC & Replay Prevention Tests ---

def test_hardware_hmac_valid_verification():
    secret = "8d4b7bd8c1ea93b8928c4c9e9786848dadb18aa54ba74eae346af847ea62ad4c"
    hw = HardwareHMAC(secret)
    now = int(time.time())
    payload = b'{"cmd_id":"test-123","success":true,"template_id":4}'

    sig = hw.generate_signature(payload, now)
    assert hw.verify(payload, now, sig), "Legitimate hardware signature must verify"


def test_hardware_hmac_spoofing_detection():
    secret = "8d4b7bd8c1ea93b8928c4c9e9786848dadb18aa54ba74eae346af847ea62ad4c"
    hw = HardwareHMAC(secret)
    now = int(time.time())
    payload = b'{"cmd_id":"test-123","success":true,"template_id":4}'
    sig = hw.generate_signature(payload, now)

    # Spoofed payload
    spoofed = b'{"cmd_id":"test-123","success":true,"template_id":1}'
    assert not hw.verify(spoofed, now, sig), "Modified payload must fail HMAC check"


def test_hardware_hmac_replay_attack_prevention():
    secret = "8d4b7bd8c1ea93b8928c4c9e9786848dadb18aa54ba74eae346af847ea62ad4c"
    hw = HardwareHMAC(secret)
    stale_timestamp = int(time.time()) - 400  # 400 seconds ago (> 120s window)
    payload = b'{"cmd_id":"stale","success":true}'
    sig = hw.generate_signature(payload, stale_timestamp)

    assert not hw.verify(payload, stale_timestamp, sig), "Stale replay packet must be rejected"


# --- 4. Cryptographic Audit Chaining & Integrity Tests ---

def test_audit_log_hash_chain():
    secret = "29ea053b6986f72f39c13e4dde2db1a1d89e050215c05d69d8066d3ac928cf26"
    chainer = AuditChainer(secret)

    logs = []
    prev_hash = None
    for i in range(5):
        entry = {
            "id": f"log-{i}",
            "nid_number": f"100000000000{i}",
            "access_decision": "granted" if i % 2 == 0 else "denied",
            "prev_hash": prev_hash,
        }
        entry["signature"] = chainer.sign_log(entry)
        chain_h = chainer.compute_chain_hash(prev_hash, entry)
        entry["chain_hash"] = chain_h
        prev_hash = chain_h
        logs.append(entry)

    valid, msg = chainer.verify_chain(logs)
    assert valid, f"Chain should be valid: {msg}"

    # Tamper with entry #2 by mutating access_decision
    tampered_logs = [dict(x) for x in logs]
    tampered_logs[2]["access_decision"] = "tampered_decision"
    valid_tampered, msg_tampered = chainer.verify_chain(tampered_logs)
    assert not valid_tampered, "Tampered chain entry must fail verification"


# --- 5. Sovereign RBAC & Master Authority Tests ---

@pytest.mark.asyncio
async def test_require_master_admin_success():
    master_claims = {
        "email": "masud.nil74@gmail.com",
        "isMaster": True,
        "isApproved": True,
    }
    result = await require_master_admin(master_claims)
    assert result["isMaster"] is True


@pytest.mark.asyncio
async def test_require_master_admin_forbidden():
    operator_claims = {
        "email": "operator@terminal.gov.bd",
        "isMaster": False,
        "isApproved": True,
    }
    with pytest.raises(HTTPException) as exc:
        await require_master_admin(operator_claims)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_require_unapproved_operator_forbidden():
    unapproved_claims = {
        "email": "hacker@test.com",
        "isMaster": False,
        "isApproved": False,
    }
    with pytest.raises(HTTPException) as exc:
        await require_approved_operator(unapproved_claims)
    assert exc.value.status_code == 403


# --- 6. UserService Transparent PII Protection Test ---

@pytest.mark.asyncio
async def test_user_service_transparent_encryption():
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "mock-uuid-1",
        "nid_number": "1122334455667",
        "full_name": "Test Citizen",
        "phone": "enc:v1:test-encrypted-phone",
        "address": "enc:v1:test-encrypted-address",
        "status": "pending",
    }]

    svc = UserService(mock_db)
    # Ensure cipher encrypts data
    data = {
        "nid_number": "1122334455667",
        "full_name": "Test Citizen",
        "phone": "+8801800000000",
        "address": "Mirpur, Dhaka",
    }
    encrypted_dict = svc._encrypt_pii(data)
    assert encrypted_dict["phone"].startswith("enc:v1:")
    assert encrypted_dict["address"].startswith("enc:v1:")

    # Decrypt
    decrypted_dict = svc._decrypt_pii(encrypted_dict)
    assert decrypted_dict["phone"] == "+8801800000000"
    assert decrypted_dict["address"] == "Mirpur, Dhaka"
