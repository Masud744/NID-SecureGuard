from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])


@router.get("")
async def get_logs(request: Request, limit: int = 100, offset: int = 0):
    supabase = request.app.state.supabase
    resp = (
        supabase.table("security_logs")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data
