import asyncio
import logging
import time
import uuid

from core.exceptions import DeviceOfflineError

logger = logging.getLogger(__name__)

HEARTBEAT_TTL_SEC = 35.0


class DeviceBridge:
    """Outbound command bridge for an ESP32-S3 connecting over a public tunnel."""

    def __init__(self):
        self._commands: asyncio.Queue[dict] = asyncio.Queue()
        self._waiters: dict[str, asyncio.Future] = {}
        self._frame_buffers: dict[str, tuple[int, list[bytes]]] = {}
        self._status: dict | None = None
        self._last_seen: float = 0.0
        self.latest_frame: bytes | None = None

    def is_online(self) -> bool:
        return self._status is not None and (time.monotonic() - self._last_seen) < HEARTBEAT_TTL_SEC

    def get_status(self) -> dict | None:
        if not self.is_online():
            return None
        return {
            **self._status,
            "mode": "tunnel",
            "last_seen_ago_sec": round(time.monotonic() - self._last_seen, 1),
        }

    def update_heartbeat(self, payload: dict) -> None:
        self._status = {
            "wifi": True,
            "camera": bool(payload.get("camera")),
            "fingerprint": bool(payload.get("fingerprint")),
            "free_heap": payload.get("free_heap"),
            "free_psram": payload.get("free_psram"),
            "ip": payload.get("ip"),
        }
        self._last_seen = time.monotonic()

    async def poll(self, heartbeat: dict, timeout: float = 12.0) -> dict | None:
        self.update_heartbeat(heartbeat)
        try:
            # Skip any stale commands whose caller already timed out
            while not self._commands.empty():
                cmd = self._commands.get_nowait()
                cmd_id = cmd.get("cmd_id")
                fut = self._waiters.get(cmd_id)
                if fut and not fut.done():
                    self._last_seen = time.monotonic()
                    return cmd

            cmd = await asyncio.wait_for(self._commands.get(), timeout=timeout)
            self._last_seen = time.monotonic()
            return cmd
        except asyncio.TimeoutError:
            self._last_seen = time.monotonic()
            return None

    def submit_frame(self, cmd_id: str, jpg_bytes: bytes) -> bool:
        self._last_seen = time.monotonic()
        self.latest_frame = jpg_bytes

        entry = self._frame_buffers.get(cmd_id)
        if not entry:
            return False

        expected, frames = entry
        frames.append(jpg_bytes)
        if len(frames) >= expected:
            self._frame_buffers.pop(cmd_id, None)
            fut = self._waiters.pop(cmd_id, None)
            if fut and not fut.done():
                fut.set_result(frames)
        return True

    def submit_result(self, cmd_id: str, payload: dict) -> bool:
        self._last_seen = time.monotonic()
        self._frame_buffers.pop(cmd_id, None)
        fut = self._waiters.pop(cmd_id, None)
        if fut and not fut.done():
            fut.set_result(payload)
            return True
        return False

    async def _dispatch(self, cmd: dict, timeout: float):
        if not self.is_online():
            raise DeviceOfflineError("ESP32 device (tunnel)", "not connected")

        cmd_id = uuid.uuid4().hex[:12]
        cmd["cmd_id"] = cmd_id
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self._waiters[cmd_id] = fut

        if cmd["type"] == "capture":
            self._frame_buffers[cmd_id] = (int(cmd.get("count", 1)), [])

        await self._commands.put(cmd)
        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        except asyncio.TimeoutError:
            partial = self._frame_buffers.pop(cmd_id, None)
            self._waiters.pop(cmd_id, None)
            if cmd["type"] == "capture" and partial and partial[1]:
                return partial[1]
            return None
        finally:
            self._waiters.pop(cmd_id, None)
            self._frame_buffers.pop(cmd_id, None)

    async def request_frames(self, count: int = 1, timeout: float = 35.0) -> list[bytes]:
        res = await self._dispatch({"type": "capture", "count": count}, timeout=timeout)
        if isinstance(res, dict) and not res.get("success", True):
            raise ValueError(res.get("message") or "ESP32 camera capture failed")
        if not res:
            raise DeviceOfflineError("ESP32 camera (tunnel)", "capture timeout")
        return res

    async def request_fingerprint_enroll(self, template_id: int, timeout: float = 40.0) -> dict:
        res = await self._dispatch(
            {"type": "enroll", "template_id": template_id}, timeout=timeout
        )
        if res is None:
            return {
                "status": "timeout",
                "success": False,
                "template_id": template_id,
                "message": "ESP32 fingerprint enroll timed out",
            }
        ok = bool(res.get("success"))
        return {
            "status": "ok" if ok else "failed",
            "success": ok,
            "template_id": res.get("template_id", template_id),
            "message": res.get("message", ""),
        }

    async def request_fingerprint_verify(self, timeout: float = 25.0) -> dict:
        res = await self._dispatch({"type": "verify"}, timeout=timeout)
        if res is None:
            return {
                "template_id": None,
                "accuracy": 0,
                "status": "timeout",
                "message": "ESP32 fingerprint verify timed out",
            }
        matched = bool(res.get("success"))
        return {
            "template_id": res.get("template_id") if matched else None,
            "accuracy": res.get("confidence", 0),
            "status": "match" if matched else "no_match",
            "message": res.get("message", ""),
        }

