from datetime import datetime, timezone


def _is_enrolled(rel) -> bool:
    if isinstance(rel, list):
        return any(r.get("status") == "enrolled" for r in rel)
    if isinstance(rel, dict):
        return rel.get("status") == "enrolled"
    return False


class UserService:
    def __init__(self, supabase):
        self.db = supabase

    async def create_user(self, data: dict) -> dict:
        payload = {**data, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
        resp = self.db.table("users").insert(payload).execute()
        return resp.data[0]

    async def get_user(self, user_id: str) -> dict | None:
        resp = (
            self.db.table("users")
            .select("*, face_profiles(*), fingerprint_records(*)")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None

    async def get_users(self, limit: int = 50, offset: int = 0) -> list[dict]:
        resp = (
            self.db.table("users")
            .select("*, face_profiles(*), fingerprint_records(*)")
            .range(offset, offset + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data

    async def update_user(self, user_id: str, data: dict) -> dict:
        resp = self.db.table("users").update(data).eq("id", user_id).execute()
        return resp.data[0]

    async def check_enrollment(self, user_id: str) -> dict:
        """Check whether both biometrics are enrolled and activate the user if so."""
        user = await self.get_user(user_id)
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
