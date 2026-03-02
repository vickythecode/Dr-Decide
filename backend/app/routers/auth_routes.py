from fastapi import APIRouter, HTTPException
import os
from app.models import UserLogin, UserSignUp, UserConfirm
from app.services.auth import sign_up_user, login_user, confirm_sign_up

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
@router.post("/confirm")
async def confirm_signup(user_data: UserConfirm):
    """
    Route Logic: Handles the incoming HTTP request and returns the JSON response.
    """
    # 1. Call the service function. It handles all the heavy lifting!
    confirm_sign_up(user_data.email, user_data.code)
    
    # 2. Return the clean HTTP response
    return {"message": "Email verified successfully! You can now log in."}
