import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user
from ..database import supabase
from ..schemas import AskRequest, AskResponse
from ..services.generation import generate_answer
from ..services.retrieval import retrieve

logger = logging.getLogger(__name__)
router = APIRouter()

UserDep = Annotated[dict | None, Depends(get_optional_user)]


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest, user: UserDep) -> AskResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    sources, reflections = await retrieve(question, top_k=7)
    top_similarity = max((s.similarity for s in sources), default=0.0)
    answer = await generate_answer(question, sources, reflections)

    if user:
        try:
            supabase.table("user_ask_history").insert({
                "user_id": user["user_id"],
                "question": question,
                "answer": answer,
            }).execute()
        except Exception:
            logger.exception("Failed to save ask history for user %s", user["user_id"])

    return AskResponse(
        answer=answer,
        sources=sources,
        reflections=reflections,
        fallback=top_similarity < 0.5,
        query=question,
    )
