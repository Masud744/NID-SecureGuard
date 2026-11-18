from fastapi import APIRouter, Request

from models.schemas import VerifyRequest, VerifyResponse

router = APIRouter(prefix="/api/v1", tags=["Authentication"])


@router.post("/verify", response_model=VerifyResponse)
async def verify_identity(body: VerifyRequest, request: Request):
    auth_service = request.app.state.auth_service
    config = request.app.state.config
    client_ip = request.client.host if request.client else None

    return await auth_service.verify_identity(
        nid_number=body.nid_number,
        stream_url=config.ESP32_CAMERA_URL,
        ip_address=client_ip,
    )
