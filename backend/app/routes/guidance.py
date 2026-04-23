from fastapi import APIRouter, HTTPException
from ..schemas import GuidanceRequest, GuidanceResponse
from ..services.retrieval import retrieve
from ..services.guidance import generate_guidance

router = APIRouter()


@router.post("/guidance", response_model=GuidanceResponse)
async def guidance(request: GuidanceRequest) -> GuidanceResponse:
    feeling = request.feeling.strip()
    if not feeling:
        raise HTTPException(status_code=400, detail="Please share how you are feeling.")

    sources, reflections = await retrieve(feeling, top_k=5)
    answer = await generate_guidance(feeling, sources, reflections)

    return GuidanceResponse(
        answer=answer,
        sources=sources,
        query=feeling,
    )
