from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.security import require_master_admin

router = APIRouter(prefix="/api/v1/operators", tags=["Operators"])


class ApproveRequest(BaseModel):
    user_id: str


class RejectRequest(BaseModel):
    user_id: str


@router.get("/pending")
async def get_pending_operators(
    request: Request,
    auth_user: Annotated[dict, Depends(require_master_admin)],
):
    supabase = request.app.state.supabase
    try:
        users = supabase.auth.admin.list_users()
        pending = []
        for u in users:
            meta = u.user_metadata or {}
            email = (u.email or "").strip().lower()
            is_master = meta.get("is_master", False) or email == "masud.nil74@gmail.com"
            is_approved = meta.get("is_approved", False) or is_master
            if not is_approved:
                pending.append({
                    "id": u.id,
                    "email": u.email,
                    "fullName": meta.get("full_name", u.email),
                    "badgeId": meta.get("badge_id", "N/A"),
                    "stationId": meta.get("station_id", "N/A"),
                    "role": meta.get("role", "verification_officer"),
                    "registeredAt": u.created_at.isoformat() if hasattr(u.created_at, "isoformat") else str(u.created_at),
                })
        return pending
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to list pending operators: {str(e)}")


@router.get("/approved")
async def get_approved_operators(
    request: Request,
    auth_user: Annotated[dict, Depends(require_master_admin)],
):
    supabase = request.app.state.supabase
    try:
        users = supabase.auth.admin.list_users()
        approved = []
        for u in users:
            meta = u.user_metadata or {}
            email = (u.email or "").strip().lower()
            is_master = meta.get("is_master", False) or email == "masud.nil74@gmail.com"
            is_approved = meta.get("is_approved", False) or is_master
            if is_approved:
                approved.append({
                    "id": u.id,
                    "email": u.email,
                    "fullName": "Shahriar Alom Masud" if is_master else meta.get("full_name", u.email),
                    "badgeId": "SEC-MASTER-01" if is_master else meta.get("badge_id", "N/A"),
                    "stationId": "National Command Center - HQ" if is_master else meta.get("station_id", "N/A"),
                    "role": "super_admin" if is_master else meta.get("role", "verification_officer"),
                    "isMaster": is_master,
                    "registeredAt": u.created_at.isoformat() if hasattr(u.created_at, "isoformat") else str(u.created_at),
                })
        return approved
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to list approved operators: {str(e)}")


@router.post("/approve")
async def approve_operator(
    body: ApproveRequest,
    request: Request,
    auth_user: Annotated[dict, Depends(require_master_admin)],
):
    supabase = request.app.state.supabase
    try:
        user_res = supabase.auth.admin.get_user_by_id(body.user_id)
        if not user_res or not user_res.user:
            raise HTTPException(404, "Operator user not found")
        meta = user_res.user.user_metadata or {}
        meta["is_approved"] = True
        supabase.auth.admin.update_user_by_id(body.user_id, {"user_metadata": meta})
        return {
            "status": "success",
            "message": f"Operator {user_res.user.email} approved by Master Admin ({auth_user['email']})",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to approve operator: {str(e)}")


@router.post("/reject")
async def reject_operator(
    body: RejectRequest,
    request: Request,
    auth_user: Annotated[dict, Depends(require_master_admin)],
):
    supabase = request.app.state.supabase
    try:
        user_res = supabase.auth.admin.get_user_by_id(body.user_id)
        if not user_res or not user_res.user:
            raise HTTPException(404, "Operator user not found")
        # Prevent Master Admin from rejecting/deleting themselves
        target_email = (user_res.user.email or "").strip().lower()
        if target_email == "masud.nil74@gmail.com":
            raise HTTPException(400, "Cannot reject sovereign Master Root Administrator account")

        supabase.auth.admin.delete_user(body.user_id)
        return {
            "status": "success",
            "message": f"Operator {target_email} purged by Master Admin ({auth_user['email']})",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to reject operator: {str(e)}")
