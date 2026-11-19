import logging
import time
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from core.crypto import HardwareHMAC

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)
hardware_hmac = HardwareHMAC(settings.ESP32_DEVICE_SECRET)


async def get_current_user_claims(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_bearer)],
) -> dict:
    """Validate Supabase Bearer token and extract user claims & metadata."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required (Bearer token)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    supabase = request.app.state.supabase

    try:
        user_res = supabase.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication session",
            )
        user = user_res.user
        email = (user.email or "").strip().lower()
        meta = user.user_metadata or {}
        is_master = (
            email == settings.MASTER_ADMIN_EMAIL.strip().lower()
            or meta.get("is_master", False)
        )
        is_approved = meta.get("is_approved", False) or is_master

        return {
            "id": user.id,
            "email": email,
            "fullName": meta.get("full_name", email),
            "role": "super_admin" if is_master else meta.get("role", "verification_officer"),
            "isMaster": is_master,
            "isApproved": is_approved,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token verification exception: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to validate authentication token",
        )


async def require_master_admin(
    claims: Annotated[dict, Depends(get_current_user_claims)],
) -> dict:
    """Enforces sovereign Master Root authority (hasan.ire.uftb@gmail.com)."""
    if not claims.get("isMaster"):
        logger.warning(
            "Access denied: Non-master user %s attempted master action",
            claims.get("email"),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Sovereign Master Root Authority required",
        )
    return claims


async def require_approved_operator(
    claims: Annotated[dict, Depends(get_current_user_claims)],
) -> dict:
    """Enforces approved operator security clearance."""
    if not claims.get("isApproved"):
        logger.warning(
            "Access denied: Unapproved operator %s attempted operator action",
            claims.get("email"),
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Operator registration pending Master clearance",
        )
    return claims


async def require_station_or_operator(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_bearer)],
    x_station_key: Annotated[str | None, Header(alias="X-Station-Key")] = None,
) -> dict:
    """Allows either a valid Station Terminal key or an authenticated approved operator."""
    # 1. Check Station Key Header
    if x_station_key and x_station_key.strip() == settings.KIOSK_API_KEY.strip():
        return {
            "role": "station_kiosk",
            "isMaster": False,
            "isApproved": True,
            "email": "kiosk@station.internal",
        }

    # 2. Check Operator Token if provided
    if credentials and credentials.credentials:
        claims = await get_current_user_claims(request, credentials)
        if claims.get("isApproved"):
            return claims

    # 3. If neither, allow kiosk local requests if origin is internal or development
    # But raise unauthorized for explicit unauthenticated remote requests
    client_host = request.client.host if request.client else ""
    if client_host in ("127.0.0.1", "localhost", "::1"):
        return {
            "role": "local_kiosk",
            "isMaster": False,
            "isApproved": True,
            "email": "local@station.internal",
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid Station Key or approved operator session required",
    )


async def verify_hardware_hmac(
    request: Request,
    x_device_timestamp: Annotated[int | None, Header(alias="X-Device-Timestamp")] = None,
    x_device_signature: Annotated[str | None, Header(alias="X-Device-Signature")] = None,
) -> bool:
    """Verifies HMAC-SHA256 signature for ESP32 hardware bridge telemetry."""
    if not x_device_signature or not x_device_timestamp:
        # If headers are missing in local dev mode, allow with warning
        logger.debug("Hardware bridge request received without cryptographic signature header")
        return False

    body_bytes = await request.body()
    is_valid = hardware_hmac.verify(
        payload=body_bytes,
        timestamp=x_device_timestamp,
        signature=x_device_signature,
        max_drift_seconds=180,
    )

    if not is_valid:
        logger.error(
            "Hardware HMAC verification failed: invalid signature or expired timestamp"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hardware cryptographic authentication failed: signature mismatch or replay detected",
        )
    return True

