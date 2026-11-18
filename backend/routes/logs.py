import re
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from config import settings
from core.crypto import AuditChainer
from core.security import require_station_or_operator

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])
chainer = AuditChainer(settings.AUDIT_LOG_SECRET)

SEAL_REGEX = re.compile(r"SIG:([a-f0-9]{64})#CHAIN:([a-f0-9]{64})#PREV:([a-f0-9]{64}|GENESIS)")


def _parse_log_entry(raw: dict) -> dict:
    cloned = dict(raw)
    reason = cloned.get("failure_reason") or ""
    match = SEAL_REGEX.search(reason)
    if match:
        cloned["signature"] = match.group(1)
        cloned["chain_hash"] = match.group(2)
        cloned["prev_hash"] = match.group(3)
        # Strip seal out of the human-facing failure reason
        clean = SEAL_REGEX.sub("", reason).replace(" | ", "").strip()
        cloned["failure_reason"] = clean if clean else None
        cloned["is_cryptographically_sealed"] = True
    else:
        cloned["signature"] = None
        cloned["chain_hash"] = None
        cloned["prev_hash"] = None
        cloned["is_cryptographically_sealed"] = False
    return cloned


@router.get("")
async def get_logs(
    request: Request,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    auth_user: Annotated[dict, Depends(require_station_or_operator)] = None,
):
    supabase = request.app.state.supabase
    resp = (
        supabase.table("security_logs")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("created_at", desc=True)
        .execute()
    )
    return [_parse_log_entry(row) for row in resp.data]


@router.get("/verify-chain")
async def verify_chain(
    request: Request,
    auth_user: Annotated[dict, Depends(require_station_or_operator)] = None,
):
    """Verifies the mathematical and cryptographic integrity of the audit log chain."""
    supabase = request.app.state.supabase
    resp = (
        supabase.table("security_logs")
        .select("*")
        .order("created_at", desc=False)
        .limit(200)
        .execute()
    )
    parsed = [_parse_log_entry(row) for row in resp.data]
    sealed_logs = [row for row in parsed if row.get("is_cryptographically_sealed")]

    valid, message = chainer.verify_chain(sealed_logs)
    return {
        "valid": valid,
        "message": message,
        "total_logs": len(parsed),
        "sealed_logs": len(sealed_logs),
        "status": "intact" if valid else "tampered",
    }
