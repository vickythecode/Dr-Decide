import uuid
from app.services.auth import verify_cognito_token
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models import AppointmentRequest
from app.services.db import get_patient_plan, update_adherence

router = APIRouter(prefix="/api/patient", tags=["Patient Operations"])

class TaskUpdate(BaseModel):
    task_id: str
    status: str

@router.get("/my-plan/{patient_id}",)
async def get_care_plan(patient_id: str, 
    current_user: dict = Depends(verify_cognito_token) ):
    """
    Phase 2: Fetches the simplified plan for the patient dashboard.
    """
    plan_data = get_patient_plan(patient_id)
    
    if not plan_data:
        raise HTTPException(status_code=404, detail="Care plan not found.")
        
    return {
        "patient_id": plan_data.get("patient_id"),
        "simplified_plan": plan_data.get("plain_plan"),
        "adherence_score": plan_data.get("adherence_score", 0)
    }

@router.post("/log-task/{patient_id}")
async def log_task_done(patient_id: str, update: TaskUpdate,
    current_user: dict = Depends(verify_cognito_token) ):
    """
    Logs adherence status when a patient marks a task as 'Done' on the frontend.
    """
    if update.status != "Done":
        return {"message": "No update required."}

    success = update_adherence(patient_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to log adherence status.")
        
    return {"message": "Task marked as done. Adherence logged successfully!"}
@router.post("/book-appointment")
async def book_appointment(req: AppointmentRequest):
    """
    Patient books a future appointment.
    """
    appointment_id = f"APT-{uuid.uuid4().hex[:6].upper()}"
    
    return {
        "message": "Appointment booked successfully.",
        "appointment_id": appointment_id,
        "date": req.appointment_date
    }