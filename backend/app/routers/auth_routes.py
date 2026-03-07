import os
import boto3
from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel 
from app.models import UserLogin, UserSignUp, UserConfirm, AppointmentStatus, ChangePasswordRequest
from app.services.auth import  sign_up_user, login_user, confirm_sign_up, change_cognito_password, verify_cognito_token
from dotenv import load_dotenv
security_scheme = HTTPBearer()
load_dotenv()

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

@auth_router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    claims: dict = Depends(verify_cognito_token), # 1. Validates the JWT cryptographically
    credentials: HTTPAuthorizationCredentials = Security(security_scheme) # 2. Grabs the raw string
):
    """Securely updates a logged-in user's password."""
    
    # 3. AWS Cognito STRICTLY requires an Access Token for this, not an ID Token.
    # Your verifier allows both, so we must double-check here:
    if claims.get('token_use') != 'access':
        raise HTTPException(
            status_code=400, 
            detail="You must provide an Access Token to change a password, but an ID Token was provided."
        )

    # 4. Extract the raw string from the credentials object
    raw_access_token = credentials.credentials

    # 5. Send it to AWS Cognito via your auth.py file
    change_cognito_password(
        access_token=raw_access_token,
        old_password=request.old_password,
        new_password=request.new_password
    )
    
    return {"message": "Password updated successfully!"}
    