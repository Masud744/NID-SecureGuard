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


@router.get("/snapshot")
async def get_snapshot(request: Request):
    bridge = request.app.state.device_bridge
    if bridge.is_online():
        frames = await bridge.request_frames(count=1, timeout=15.0)
        return Response(content=frames[0], media_type="image/jpeg")
    if bridge.latest_frame:
        return Response(content=bridge.latest_frame, media_type="image/jpeg")
    raise HTTPException(503, "No tunneled ESP32 connected")

