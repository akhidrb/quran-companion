from fastapi import APIRouter, HTTPException
from ..schemas import LoginRequest, SignupRequest, TokenResponse
from ..database import supabase
from ..auth import create_token, hash_pin, verify_pin

router = APIRouter()


@router.post("/auth/signup", response_model=TokenResponse)
async def signup(request: SignupRequest) -> TokenResponse:
    existing = (
        supabase.table("users")
        .select("id")
        .eq("username", request.username)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="That username is already taken. Please choose another.",
        )

    result = (
        supabase.table("users")
        .insert({"username": request.username, "pin_hash": hash_pin(request.pin)})
        .execute()
    )
    user = result.data[0]
    return TokenResponse(
        token=create_token(user["id"], user["username"]),
        username=user["username"],
        user_id=user["id"],
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    result = (
        supabase.table("users")
        .select("id, username, pin_hash")
        .eq("username", request.username)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=401,
            detail="No account found with that username. Please check the spelling or create an account.",
        )

    user = result.data[0]
    if not verify_pin(request.pin, user["pin_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN. Please try again.")

    return TokenResponse(
        token=create_token(user["id"], user["username"]),
        username=user["username"],
        user_id=user["id"],
    )
