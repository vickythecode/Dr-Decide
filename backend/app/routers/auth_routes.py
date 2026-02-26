from fastapi import APIRouter, HTTPException
from app.models import UserLogin, UserSignUp
from app.services.auth import sign_up_user, login_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup")
async def signup(user: UserSignUp):
    response = sign_up_user(user.email, user.password, user.role)
    if "error" in response:
        raise HTTPException(status_code=400, detail=response["error"])
    return {"message": "User created successfully. Please check email to verify."}

@router.post("/login")
async def login(user: UserLogin):
    response = login_user(user.email, user.password)
    if "error" in response:
        raise HTTPException(status_code=401, detail=response["error"])
    
    return {
        "message": "Login successful",
        "access_token": response['AccessToken'],
        "id_token": response['IdToken']
    }