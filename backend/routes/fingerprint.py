from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from models.schemas import EnrollmentStatus, FingerprintEnrollRequest

router = APIRouter(prefix="/api/v1/enroll", tags=["Fingerprint Enrollment"])


@router.get("/next-slot")
async def get_next_available_slot(request: Request):
    supabase = request.app.state.supabase
    records = supabase.table("fingerprint_records").select("template_id").execute()
    occupied = sorted([
        r["template_id"] for r in (records.data or []) if r.get("template_id") is not None
    ])
    occupied_set = set(occupied)

    candidate = (max(occupied) + 1) if occupied else 1
    if candidate > 200:
        candidate = 1
        for s in range(1, 201):
            if s not in occupied_set:
                candidate = s
                break

    return {
        "next_slot": candidate,
        "occupied_slots": occupied,
    }


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
        records = supabase.table("fingerprint_records").select("template_id").execute()
        occupied = sorted([
            r["template_id"] for r in (records.data or []) if r.get("template_id") is not None
        ])
        candidate = (max(occupied) + 1) if occupied else 1
        if candidate > 200:
            for s in range(1, 201):
                if s not in occupied:
                    candidate = s
                    break
        raise HTTPException(
            409,
            f"Template slot {body.template_id} is already assigned to another user. Next available slot is Slot {candidate}.",
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
