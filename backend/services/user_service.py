from datetime import datetime, timezone
import logging

from config import settings
from core.crypto import AESGCMCipher

logger = logging.getLogger(__name__)


def _is_enrolled(rel) -> bool:
    if isinstance(rel, list):
        return any(r.get("status") == "enrolled" for r in rel)
    if isinstance(rel, dict):
        return rel.get("status") == "enrolled"
    return False


class UserService:
    def __init__(self, supabase):
        self.db = supabase
        self.cipher = AESGCMCipher(settings.DATA_ENCRYPTION_KEY)

    def _encrypt_pii(self, data: dict) -> dict:
        """Encrypts sensitive citizen PII fields (address, phone) before storage."""
        cloned = dict(data)
        if "address" in cloned and cloned["address"]:
            cloned["address"] = self.cipher.encrypt(str(cloned["address"]))
        if "phone" in cloned and cloned["phone"]:
            cloned["phone"] = self.cipher.encrypt(str(cloned["phone"]))
        return cloned

    def _decrypt_pii(self, user: dict | None) -> dict | None:
        """Decrypts encrypted PII fields transparently for authorized consumption."""
        if not user:
            return None
        cloned = dict(user)
        try:
            if cloned.get("address"):
                cloned["address"] = self.cipher.decrypt(cloned["address"])
            if cloned.get("phone"):
                cloned["phone"] = self.cipher.decrypt(cloned["phone"])
            if cloned.get("full_name") and str(cloned["full_name"]).startswith("enc:v1:"):
                cloned["full_name"] = self.cipher.decrypt(cloned["full_name"])
        except Exception as e:
            logger.warning("PII decryption warning for user %s: %s", cloned.get("id"), e)
        return cloned

    async def create_user(self, data: dict) -> dict:
        encrypted_payload = self._encrypt_pii(data)
        payload = {
            **encrypted_payload,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = self.db.table("users").insert(payload).execute()
        return self._decrypt_pii(resp.data[0])

    async def get_user(self, user_id: str) -> dict | None:
        resp = (
            self.db.table("users")
            .select("*, face_profiles(*), fingerprint_records(*)")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        return self._decrypt_pii(resp.data[0]) if resp.data else None

    async def get_users(self, limit: int = 50, offset: int = 0) -> list[dict]:
        resp = (
            self.db.table("users")
            .select("*, face_profiles(*), fingerprint_records(*)")
            .range(offset, offset + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )
        return [self._decrypt_pii(u) for u in resp.data]

    async def update_user(self, user_id: str, data: dict) -> dict:
        encrypted_payload = self._encrypt_pii(data)
        resp = self.db.table("users").update(encrypted_payload).eq("id", user_id).execute()
        return self._decrypt_pii(resp.data[0])

    async def check_enrollment(self, user_id: str) -> dict:
        """Check whether both biometrics are enrolled and activate the user if so."""
        user = await self.get_user(user_id)
        if not user:
            return {
                "user_id": user_id,
                "face_enrolled": False,
                "fingerprint_enrolled": False,
                "fully_registered": False,
            }
        face_enrolled = _is_enrolled(user.get("face_profiles"))
        fp_enrolled = _is_enrolled(user.get("fingerprint_records"))
        fully_registered = face_enrolled and fp_enrolled

        if fully_registered and user.get("status") != "active":
            await self.update_user(user_id, {"status": "active"})

        return {
            "user_id": user_id,
            "face_enrolled": face_enrolled,
            "fingerprint_enrolled": fp_enrolled,
            "fully_registered": fully_registered,
        }
