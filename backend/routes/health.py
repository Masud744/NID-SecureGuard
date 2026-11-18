from fastapi import APIRouter, Request

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(request: Request):
    fp_service = request.app.state.fp_service
    try:
        device = await fp_service.get_device_status()
        device_online = True
    except Exception:
        device = None
        device_online = False

    return {
        "status": "ok",
        "device_online": device_online,
        "camera": device.get("camera") if device else None,
        "fingerprint_sensor": device.get("fingerprint") if device else None,
    }
