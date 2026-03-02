from pydantic import BaseModel
from typing import List, Optional

from enum import Enum
from pydantic import BaseModel
from typing import Optional

# 1. Define strict statuses to prevent typos anywhere in your app!
class AppointmentStatus(str, Enum):
    SCHEDULED = "Scheduled"          # Booked for a future date
    WAITING = "Waiting"              # Patient arrived, generated queue token
    IN_CONSULTATION = "In-Consultation" # Doctor is seeing them right now
    COMPLETED = "Completed"          # Visit is done
    NO_SHOW = "No-Show"              # Patient never arrived
    CANCELLED = "Cancelled"          # Cancelled beforehand

# 2. What the Frontend SENDS to create an appointment
class AppointmentRequest(BaseModel):
    patient_id: str
    patient_name: str # Added this based on our previous fix!
    doctor_id: str
    appointment_date: str
    reason: Optional[str] = "General Consultation"
    # Notice we don't ask the frontend for status here. It defaults in the DB!

# 3. What the Database STORES (and returns to the frontend)
class AppointmentResponse(BaseModel):
    appointment_id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    appointment_date: str
    reason: str
    status: AppointmentStatus = AppointmentStatus.SCHEDULED # Defaults to Scheduled!

class QueueToken(BaseModel):
    patient_id: str
    appointment_id: str
    token_number: int
    status: AppointmentStatus # Uses the exact same Enum to stay perfectly synced!

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
    city: str
    state: str
    pincode: str
class PatientProfileSetup(BaseModel):
    full_name: str
    age: int
    gender: str
    phone_number: str
    blood_group: Optional[str] = "Unknown"
    emergency_contact: Optional[str] = None
    known_allergies: Optional[str] = "None"
    city: str
    state: str
    pincode: str
class UserConfirm(BaseModel):
    email: str
    code: str