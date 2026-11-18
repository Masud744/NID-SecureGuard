from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from models.schemas import EnrollmentStatus, FingerprintEnrollRequest

router = APIRouter(prefix="/api/v1/enroll", tags=["Fingerprint Enrollment"])


@router.post("/fingerprint/{user_id}", response_model=EnrollmentStatus)
async def enroll_fingerprint(
    user_id: str, body: FingerprintEnrollRequest, request: Request
):
    fp_service = request.app.state.fp_service
    user_service = request.app.state.user_service
    supabase = request.app.state.supabase

    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(404, f"User {user_id} not found")

    existing = (
        supabase.table("fingerprint_records")
        .select("user_id")
        .eq("template_id", body.template_id)
        .limit(1)
        .execute()
    )
    if existing.data and existing.data[0]["user_id"] != user_id:
        raise HTTPException(
            409,
            f"Template slot {body.template_id} is already assigned to another user",
        )

    result = await fp_service.enroll(body.template_id)
    if not result.get("success"):
        raise HTTPException(
            422,
            f"Fingerprint enrollment failed: {result.get('message') or 'unknown error'}",
        )

    supabase.table("fingerprint_records").upsert(
        {
            "user_id": user_id,
            "template_id": body.template_id,
            "status": "enrolled",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="template_id",
    ).execute()

    return await user_service.check_enrollment(user_id)
