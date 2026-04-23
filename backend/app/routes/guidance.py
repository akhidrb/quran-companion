import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user
from ..database import supabase
from ..schemas import GuidanceRequest, GuidanceResponse
from ..services.guidance import generate_guidance
from ..services.retrieval import retrieve

logger = logging.getLogger(__name__)
router = APIRouter()

UserDep = Annotated[dict | None, Depends(get_optional_user)]


@router.post("/guidance", response_model=GuidanceResponse)
async def guidance(request: GuidanceRequest, user: UserDep) -> GuidanceResponse:
    feeling = request.feeling.strip()
    if not feeling:
        raise HTTPException(status_code=400, detail="Please share how you are feeling.")

    sources, reflections = await retrieve(feeling, top_k=5)
    answer = await generate_guidance(feeling, sources, reflections)

    if user:
        try:
            supabase.table("user_guidance_history").insert({
                "user_id": user["user_id"],
                "feeling": feeling,
                "answer": answer,
            }).execute()
        except Exception:
            logger.exception("Failed to save guidance history for user %s", user["user_id"])

    return GuidanceResponse(
        answer=answer,
        sources=sources,
        query=feeling,
    )
