import logging

import httpx

from core.exceptions import DeviceOfflineError

logger = logging.getLogger(__name__)


def _extract_error(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        return body.get("error") or body.get("message") or resp.text
    except ValueError:
        return resp.text or f"HTTP {resp.status_code}"


class FingerprintService:
    def __init__(self, esp32_base_url: str):
        self.base_url = esp32_base_url.rstrip("/")

    async def get_device_status(self) -> dict:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/status")
                resp.raise_for_status()
                return resp.json()
        except (httpx.RequestError, httpx.HTTPStatusError):
            raise DeviceOfflineError("ESP32 device", self.base_url)

    async def get_status(self):
        data = await self.get_device_status()
        return data.get("fingerprint", data)

    async def enroll(self, template_id: int) -> dict:
        """Start fingerprint enrollment on the ESP32 for the given slot."""
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                # ESP32 WebServer reads template_id via server.arg()
                resp = await client.post(
                    f"{self.base_url}/fingerprint/enroll",
                    params={"template_id": template_id},
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 503:
                raise DeviceOfflineError("ESP32 fingerprint sensor", self.base_url)
            status = "timeout" if e.response.status_code == 504 else "failed"
            return {
                "status": status,
                "success": False,
                "template_id": template_id,
                "message": _extract_error(e.response),
            }
        except httpx.RequestError:
            raise DeviceOfflineError("ESP32 fingerprint sensor", self.base_url)

        ok = bool(data.get("success")) or data.get("status") == "ok"
        return {
            "status": "ok" if ok else "failed",
            "success": ok,
            "template_id": data.get("template_id", template_id),
            "message": data.get("message") or data.get("error", ""),
        }

    async def verify(self) -> dict:
        """Ask the ESP32 to scan and match a fingerprint against stored templates."""
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(f"{self.base_url}/fingerprint/verify")
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 503:
                raise DeviceOfflineError("ESP32 fingerprint sensor", self.base_url)
            status = "timeout" if e.response.status_code == 504 else "failed"
            return {
                "template_id": None,
                "accuracy": 0,
                "status": status,
                "message": _extract_error(e.response),
            }
        except httpx.RequestError:
            raise DeviceOfflineError("ESP32 fingerprint sensor", self.base_url)

        matched = bool(data.get("success")) or data.get("status") == "match"
        return {
            "template_id": data.get("template_id") if matched else None,
            "accuracy": data.get("confidence", data.get("accuracy", 0)),
            "status": "match" if matched else "no_match",
            "message": data.get("message", ""),
        }
