from fastapi import Request
from fastapi.responses import JSONResponse


class DeviceOfflineError(Exception):
    def __init__(self, device: str, url: str):
        self.device = device
        self.url = url
        super().__init__(f"{device} at {url} is not responding")


class BiometricError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


async def device_offline_handler(request: Request, exc: DeviceOfflineError):
    return JSONResponse(
        status_code=503,
        content={"error": "device_offline", "detail": str(exc)},
    )


async def biometric_error_handler(request: Request, exc: BiometricError):
    return JSONResponse(
        status_code=422,
        content={"error": "biometric_error", "detail": exc.detail},
    )
