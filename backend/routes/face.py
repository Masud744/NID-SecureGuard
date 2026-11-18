import zlib
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from models.schemas import EnrollmentStatus, FaceEnrollRequest

router = APIRouter(prefix="/api/v1/enroll", tags=["Face Enrollment"])


def _existing_label(user: dict) -> int | None:
    rel = user.get("face_profiles")
    if isinstance(rel, list) and rel:
        return rel[0].get("model_label")
    if isinstance(rel, dict):
        return rel.get("model_label")
    return None


@router.post("/face/{user_id}", response_model=EnrollmentStatus)
async def enroll_face(
    user_id: str, request: Request, body: FaceEnrollRequest | None = None
):
    face_service = request.app.state.face_service
    user_service = request.app.state.user_service
    config = request.app.state.config
    supabase = request.app.state.supabase

    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(404, f"User {user_id} not found")

    sample_count = body.sample_count if body else config.FACE_SAMPLES_COUNT
    # deterministic positive 32-bit int for OpenCV LBPH labels
    model_label = _existing_label(user) or (zlib.crc32(user_id.encode()) & 0x7FFFFFFF)

    try:
        await face_service.enroll_face(
            user_id=user_id,
            model_label=model_label,
            stream_url=config.ESP32_CAMERA_URL,
            num_samples=sample_count,
            supabase_client=supabase,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))

    supabase.table("face_profiles").upsert(
        {
            "user_id": user_id,
            "model_label": model_label,
            "status": "enrolled",
            "samples_folder": f"face-samples/{user_id}",
            "enrolled_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()

    return await user_service.check_enrollment(user_id)
