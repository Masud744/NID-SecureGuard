import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _unwrap_relation(rel) -> dict | None:
    """PostgREST returns a dict for unique 1:1 relations and a list for 1:N."""
    if isinstance(rel, list):
        return rel[0] if rel else None
    return rel if isinstance(rel, dict) else None


class AuthService:
    def __init__(self, face_service, fp_service, supabase, config):
        self.face = face_service
        self.fp = fp_service
        self.supabase = supabase
        self.config = config

    async def verify_identity(
        self, nid_number: str, stream_url: str, ip_address: str | None = None
    ) -> dict:
        """Run dual-biometric verification for the given NID.

        Access is granted only when both face and fingerprint match the same user.
        """
        user_resp = (
            self.supabase.table("users")
            .select("*, face_profiles(*), fingerprint_records(*)")
            .eq("nid_number", nid_number)
            .limit(1)
            .execute()
        )
        user = user_resp.data[0] if user_resp.data else None
        if not user:
            await self._log_attempt(
                nid_number=nid_number,
                decision="denied",
                reason="user not found",
                ip_address=ip_address,
            )
            return self._denied(nid_number, reason="user not found")

        user_id = user["id"]
        user_status = user.get("status")
        if user_status != "active":
            reason = f"user account is {user_status}"
            await self._log_attempt(
                nid_number=nid_number,
                decision="denied",
                reason=reason,
                user_id=user_id,
                ip_address=ip_address,
            )
            return self._denied(nid_number, reason=reason)

        try:
            frame = await self.face.capture_from_esp32(stream_url)
            label, confidence, face_status = self.face.recognize_face(
                frame, self.config.FACE_CONFIDENCE_THRESHOLD
            )
        except Exception as e:
            logger.error("Face capture failed: %s", e)
            reason = f"face capture error: {e}"
            await self._log_attempt(
                nid_number=nid_number,
                decision="denied",
                reason=reason,
                user_id=user_id,
                face_result="error",
                ip_address=ip_address,
            )
            return self._denied(nid_number, reason=reason)

        face_result = {
            "label": label,
            "confidence": float(confidence),
            "status": face_status,
        }

        face_profile = _unwrap_relation(user.get("face_profiles"))
        expected_label = (
            face_profile.get("model_label")
            if face_profile and face_profile.get("status") == "enrolled"
            else None
        )
        face_match = face_status == "match" and label == expected_label

        try:
            fp_result = await self.fp.verify()
        except Exception as e:
            logger.error("Fingerprint verify failed: %s", e)
            reason = f"fingerprint error: {e}"
            await self._log_attempt(
                nid_number=nid_number,
                decision="denied",
                reason=reason,
                user_id=user_id,
                face_result=face_status,
                face_confidence=float(confidence),
                fingerprint_result="error",
                ip_address=ip_address,
            )
            return self._denied(nid_number, face_result=face_result, reason=reason)

        fp_record = _unwrap_relation(user.get("fingerprint_records"))
        expected_tid = (
            fp_record.get("template_id")
            if fp_record and fp_record.get("status") == "enrolled"
            else None
        )
        fp_match = (
            fp_result.get("status") == "match"
            and fp_result.get("template_id") == expected_tid
        )

        if face_match and fp_match:
            decision = "granted"
            reason = None
        else:
            decision = "denied"
            parts = []
            if not face_match:
                parts.append("face mismatch")
            if not fp_match:
                parts.append("fingerprint mismatch")
            reason = ", ".join(parts)

        await self._log_attempt(
            nid_number=nid_number,
            decision=decision,
            reason=reason,
            user_id=user_id,
            face_result=face_status,
            face_confidence=float(confidence),
            fingerprint_result=fp_result.get("status"),
            fingerprint_template_id=fp_result.get("template_id"),
            ip_address=ip_address,
        )

        return {
            "access_decision": decision,
            "nid_number": nid_number,
            "face_result": face_result,
            "fingerprint_result": fp_result,
            "failure_reason": reason,
            "timestamp": datetime.now(timezone.utc),
        }

    async def _log_attempt(
        self,
        nid_number: str,
        decision: str,
        reason: str | None = None,
        user_id: str | None = None,
        face_result: str | None = None,
        face_confidence: float | None = None,
        fingerprint_result: str | None = None,
        fingerprint_template_id: int | None = None,
        ip_address: str | None = None,
    ):
        try:
            self.supabase.table("security_logs").insert({
                "user_id": user_id,
                "nid_number": nid_number,
                "face_result": face_result,
                "face_confidence": face_confidence,
                "fingerprint_result": fingerprint_result,
                "fingerprint_template_id": fingerprint_template_id,
                "access_decision": decision,
                "failure_reason": reason,
                "ip_address": ip_address,
            }).execute()
        except Exception as e:
            logger.error("Failed to write security log: %s", e)

    @staticmethod
    def _denied(nid_number, face_result=None, fingerprint_result=None, reason=None):
        return {
            "access_decision": "denied",
            "nid_number": nid_number,
            "face_result": face_result or {},
            "fingerprint_result": fingerprint_result or {},
            "failure_reason": reason,
            "timestamp": datetime.now(timezone.utc),
        }
