import uuid
import boto3
import os
from boto3.dynamodb.conditions import Attr, Key
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.models import AppointmentRequest, PatientProfileSetup, TaskUpdate
from app.services.auth import require_role 
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/patient", tags=["Patient Operations"])

# Initialize DynamoDB directly to sync with your AWS backend
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
care_plans_table = dynamodb.Table('DrDecideCarePlans')
appointments_table = dynamodb.Table('DrDecideAppointments')
notifications_table = dynamodb.Table('DrDecideNotifications')
doctors_table = dynamodb.Table('DrDecideDoctors')
patients_table = dynamodb.Table('DrDecidePatients')

@router.get("/my-appointments")
async def get_patient_appointments(
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Retrieves all appointments for the logged-in patient.
    """
    patient_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    try:
        response = appointments_table.scan(
            FilterExpression=Attr('patient_email').eq(patient_email)
        )
        my_appointments = response.get('Items', [])
        my_appointments.sort(key=lambda x: x.get('appointment_date', ''), reverse=True)
        
        return {"total_visits": len(my_appointments), "appointments": my_appointments}
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve appointments.")

# FIX: Removed {patient_id} from the URL path!
@router.get("/my-plan")
async def get_care_plan(
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Phase 2: Fetches the AI-simplified plan for the patient dashboard from DynamoDB.
    """
    # FIX: Securely extract the patient_id from the token
    patient_id = current_user.get('sub') 
    
    try:
        response = care_plans_table.query(
            KeyConditionExpression=Key('patient_id').eq(patient_id)
        )
        
        plans = response.get('Items', [])
        if not plans:
            raise HTTPException(status_code=404, detail="Care plan not found.")
            
        latest_plan = plans[-1]
        
        return {
            "patient_id": latest_plan.get("patient_id"),
            "simplified_plan": latest_plan.get("simplified_plan"), 
            "follow_up_reminder": latest_plan.get("follow_up_reminder"),
            "status": latest_plan.get("status")
        }
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch care plan.")

# FIX: Removed {patient_id} from the URL path!
@router.post("/log-task")
async def log_task_done(
    update: TaskUpdate,
    current_user: dict = Depends(require_role("Patient")) 
):
    """
    Logs adherence status when a patient marks a task as 'Done' on the frontend.
    """
    # FIX: Securely extract the patient_id from the token
    patient_id = current_user.get('sub')
    
    if update.status != "Done":
        return {"message": "No update required."}

    success = True # Mocking success for now until the adherence table is built
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to log adherence status.")
        
    return {"message": f"Task {update.task_id} marked as done for {patient_id}. Adherence logged successfully!"}

@router.post("/book-appointment")
async def book_appointment(
    req: AppointmentRequest,
    current_user: dict = Depends(require_role("Patient")) 
):
    """
    Patient books a future appointment. Saves directly to DynamoDB.
    """
    patient_id = current_user.get('sub') 
    patient_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    appointment_id = f"APT-{uuid.uuid4().hex[:6].upper()}"
    
    record = {
        'appointment_id': appointment_id,
        'patient_email': patient_email,
        'patient_id': patient_id, 
        'doctor_email': req.doctor_id, 
        'appointment_date': req.appointment_date,
        'reason': req.reason,
        'status': 'Scheduled'
    }
    
    try:
        appointments_table.put_item(Item=record)
        return {
            "message": "Appointment booked successfully.",
            "appointment_id": appointment_id,
            "patient_id": patient_id, 
            "date": req.appointment_date,
            "status": "Scheduled"
        }
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to book appointment in database.")

@router.get("/notifications")
async def get_notifications(
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Fetches in-app notifications for the patient dashboard.
    """
    patient_id = current_user.get('sub') 
    
    try:
        response = notifications_table.scan(
            FilterExpression=Attr('patient_id').eq(patient_id)
        )
        
        my_notifications = response.get('Items', [])
        my_notifications.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        unread_count = sum(1 for n in my_notifications if n.get('status') == 'Unread')
        
        return {
            "unread_count": unread_count, 
            "notifications": my_notifications
        }
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve notifications.")
    from typing import Optional




@router.get("/doctors")
async def search_nearby_doctors(
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    pincode: Optional[str] = None,
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Smart Search: Finds doctors based on specialty, city, or exact pincode.
    """
    try:
        # Start with a base scan (In a production app, we would use a Global Secondary Index here)
        response = doctors_table.scan()
        all_doctors = response.get('Items', [])

        # Apply our "Smart Filters" in Python
        filtered_doctors = all_doctors

        # 1. Filter by Specialty (if provided)
        if specialty:
            filtered_doctors = [doc for doc in filtered_doctors if doc.get('specialty', '').lower() == specialty.lower()]
            
        # 2. Filter by City (if provided)
        if city:
            filtered_doctors = [doc for doc in filtered_doctors if doc.get('city', '').lower() == city.lower()]
            
        # 3. Filter by Pincode (if provided - this is the most accurate "nearby" check)
        if pincode:
            filtered_doctors = [doc for doc in filtered_doctors if doc.get('pincode', '') == pincode]

        # Clean up the output so we don't send raw database data to the frontend
        clean_results = []
        for doc in filtered_doctors:
            clean_results.append({
                "doctor_id": doc.get("doctor_id"),
                "doctor_name": doc.get("doctor_name"),
                "specialty": doc.get("specialty"),
                "clinic_name": doc.get("clinic_name"),
                "location": f"{doc.get('city', '').title()}, {doc.get('pincode', '')}"
            })

        return {
            "results_found": len(clean_results),
            "doctors": clean_results
        }

    except Exception as e:
        print(f"Doctor Search Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to search for doctors.")

@router.post("/setup-profile")
async def setup_patient_profile(
    profile_data: PatientProfileSetup,
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Saves the patient's personal and medical details after their first login.
    """
    patient_id = current_user.get('sub')
    patient_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')

    record = {
        'patient_id': patient_id,
        'email': patient_email,
        'full_name': profile_data.full_name,
        'age': profile_data.age,
        'gender': profile_data.gender,
        'phone_number': profile_data.phone_number,
        'blood_group': profile_data.blood_group,
        'emergency_contact': profile_data.emergency_contact,
        'known_allergies': profile_data.known_allergies,
        'profile_status': 'Complete',
        'updated_at': datetime.utcnow().isoformat()
    }

    try:
        patients_table.put_item(Item=record)
        return {
            "message": "Patient profile completed successfully!", 
            "profile": record
        }
    except Exception as e:
        print(f"Profile Setup Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save patient profile.")


@router.get("/profile")
async def get_patient_profile(
    current_user: dict = Depends(require_role("Patient"))
):
    """
    Fetches the patient's profile. Frontend can use this to check if the profile is complete.
    """
    patient_id = current_user.get('sub')
    
    try:
        response = patients_table.get_item(Key={'patient_id': patient_id})
        
        if 'Item' in response:
            return response['Item']
        else:
            # If no item is found, the profile isn't set up yet!
            return {
                "message": "Profile not set up yet.", 
                "profile_status": "Incomplete"
            }
            
    except Exception as e:
        print(f"Profile Fetch Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient profile.")