import os
import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel # 1. ADDED MISSING IMPORT

# Removed UpdateStatusRequest from this import since it's defined below
from app.models import UserLogin, UserSignUp, UserConfirm, AppointmentStatus
from app.services.auth import  sign_up_user, login_user, confirm_sign_up

# 2. SEPARATED THE ROUTERS SO PATHS DON'T GET MIXED UP
auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
appointment_router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
appointments_table = dynamodb.Table('DrDecideAppointments')

# --- AUTH ROUTES ---

@auth_router.post("/signup")
async def signup(user: UserSignUp):
    response = sign_up_user(user.email, user.password, user.role)
    if "error" in response:
        raise HTTPException(status_code=400, detail=response["error"])
    return {"message": "User created successfully. Please check email to verify."}

@auth_router.post("/login")
async def login(user: UserLogin):
    response = login_user(user.email, user.password)
    if "error" in response:
        raise HTTPException(status_code=401, detail=response["error"])
    
    return {
        "message": "Login successful",
        "access_token": response['AccessToken'],
        "id_token": response['IdToken']
    }
class ForceChangePasswordRequest(BaseModel):
    email: str
    new_password: str
    session: str

@auth_router.post("/force-change-password")
async def force_change_password(req: ForceChangePasswordRequest):
    result = respond_to_auth_challenge(req.email, req.new_password, req.session)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result
@auth_router.post("/confirm")
async def confirm_signup(user_data: UserConfirm):
    confirm_sign_up(user_data.email, user_data.code)
    return {"message": "Email verified successfully! You can now log in."}


# --- APPOINTMENT ROUTES ---

class UpdateStatusRequest(BaseModel):
    status: AppointmentStatus

# Notice this uses appointment_router now! Path becomes: /api/appointments/{appointment_id}/status
@appointment_router.patch("/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, request: UpdateStatusRequest):
    """
    Updates the status of an appointment (e.g. Scheduled -> In-Consultation)
    """
    try:
        appointments_table.update_item(
            Key={'appointment_id': appointment_id},
            UpdateExpression="SET #s = :status",
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':status': request.status.value} 
        )
        return {"message": f"Appointment marked as {request.status.value}"}
    
    # 3. FIXED THE DANGLING EXCEPTION BLOCK
    except Exception as e:
        print(f"DynamoDB Update Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update appointment status.")