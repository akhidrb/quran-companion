from fastapi import APIRouter, HTTPException
from ..schemas import AskRequest, AskResponse
from ..services.retrieval import retrieve
from ..services.generation import generate_answer

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest) -> AskResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    sources, reflections = await retrieve(question, top_k=7)
    top_similarity = max((s.similarity for s in sources), default=0.0)
    answer = await generate_answer(question, sources, reflections)

    return AskResponse(
        answer=answer,
        sources=sources,
        reflections=reflections,
        fallback=top_similarity < 0.5,
        query=question,
    )
