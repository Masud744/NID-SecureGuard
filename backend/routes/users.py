from fastapi import APIRouter, HTTPException, Request

from models.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(payload: UserCreate, request: Request):
    user_service = request.app.state.user_service
    try:
        return await user_service.create_user(payload.model_dump())
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(409, f"NID {payload.nid_number} is already registered")
        raise HTTPException(500, str(e))


@router.get("", response_model=list[UserResponse])
async def list_users(request: Request, limit: int = 50, offset: int = 0):
    user_service = request.app.state.user_service
    return await user_service.get_users(limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, request: Request):
    user_service = request.app.state.user_service
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(404, f"User {user_id} not found")
    return user
