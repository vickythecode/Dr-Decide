from pydantic import BaseModel
from typing import List, Optional

# --- Appointment & Queue Models ---
class AppointmentRequest(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: str
    reason: Optional[str] = "General Consultation"  

class QueueToken(BaseModel):
    patient_id: str
    appointment_id: str
    token_number: int
    status: str # "Waiting", "In-Consultation", "Completed"

# --- Consultation Models ---
class ConsultationDetails(BaseModel):
    patient_id: str
    appointment_id: str
    phone_number: str
    medical_history: str
    query: str = ""
    current_examination: str
    medicines_prescribed: str
    follow_up_details: str

class CarePlanResponse(BaseModel):
    patient_id: str
    simplified_plan: str
    follow_up_reminder: str
    status: str
class UserSignUp(BaseModel):
    email: str
    password: str
    role: str # "Doctor" or "Patient"

class UserLogin(BaseModel):
    email: str
    password: str

class TaskUpdate(BaseModel):
    task_id: str
    status: str
class DoctorProfileSetup(BaseModel):
    doctor_name: str
    specialty: str
    clinic_name: str