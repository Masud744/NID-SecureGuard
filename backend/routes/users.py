from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from core.security import require_station_or_operator
from models.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    request: Request,
    auth_user: Annotated[dict, Depends(require_station_or_operator)],
):
    user_service = request.app.state.user_service
    try:
        return await user_service.create_user(payload.model_dump())
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(409, f"NID {payload.nid_number} is already registered")
        raise HTTPException(500, str(e))


@router.get("", response_model=list[UserResponse])
async def list_users(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    auth_user: Annotated[dict, Depends(require_station_or_operator)] = None,
):
    user_service = request.app.state.user_service
    return await user_service.get_users(limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    request: Request,
    auth_user: Annotated[dict, Depends(require_station_or_operator)] = None,
):
    user_service = request.app.state.user_service
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(404, f"User {user_id} not found")
    return user
