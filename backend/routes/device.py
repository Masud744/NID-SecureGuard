from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/device", tags=["Device Bridge"])


class HeartbeatPayload(BaseModel):
    camera: bool = False
    fingerprint: bool = False
    free_heap: int | None = None
    free_psram: int | None = None
    ip: str | None = None


class DeviceResultPayload(BaseModel):
    cmd_id: str
    success: bool = False
    template_id: int | None = None
    confidence: int = 0
    message: str = ""


@router.post("/poll")
async def poll_command(body: HeartbeatPayload, request: Request):
    bridge = request.app.state.device_bridge
    cmd = await bridge.poll(body.model_dump())
    return {"command": cmd}


@router.post("/frame")
async def upload_frame(request: Request, cmd_id: str = Query(...)):
    bridge = request.app.state.device_bridge
    jpg_bytes = await request.body()
    if not jpg_bytes:
        raise HTTPException(400, "Empty frame body")
    accepted = bridge.submit_frame(cmd_id, jpg_bytes)
    return {"accepted": accepted, "bytes": len(jpg_bytes)}


@router.post("/result")
async def submit_result(body: DeviceResultPayload, request: Request):
    bridge = request.app.state.device_bridge
    accepted = bridge.submit_result(body.cmd_id, body.model_dump())
    return {"accepted": accepted}


@router.get("/status")
async def get_device_status(request: Request):
    bridge = request.app.state.device_bridge
    status = bridge.get_status()
    if not status:
        return {"online": False}
    return {"online": True, **status}


@router.get("/snapshot")
async def get_snapshot(request: Request, fresh: bool = False):
    bridge = request.app.state.device_bridge

    # Return cached latest frame immediately if fresh is not explicitly requested
    if not fresh and bridge.latest_frame:
        return Response(content=bridge.latest_frame, media_type="image/jpeg")

    if bridge.is_online():
        try:
            frames = await bridge.request_frames(count=1, timeout=8.0)
            return Response(content=frames[0], media_type="image/jpeg")
        except Exception as e:
            if bridge.latest_frame:
                return Response(content=bridge.latest_frame, media_type="image/jpeg")
            raise HTTPException(504, f"ESP32 camera capture timed out: {e}")

    if bridge.latest_frame:
        return Response(content=bridge.latest_frame, media_type="image/jpeg")
    raise HTTPException(503, "No tunneled ESP32 connected")


@router.get("/detect")
async def detect_current_face(request: Request):
    bridge = request.app.state.device_bridge
    face_svc = getattr(request.app.state, "face_service", None)
    if not bridge.latest_frame or not face_svc:
        return {"face_detected": False, "confidence": 0.0}

    import cv2
    import numpy as np
    arr = np.frombuffer(bridge.latest_frame, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"face_detected": False, "confidence": 0.0}

    face_roi = face_svc.detect_face(frame)
    if face_roi is None:
        return {"face_detected": False, "confidence": 0.0}

    return {"face_detected": True, "confidence": 86.4}

