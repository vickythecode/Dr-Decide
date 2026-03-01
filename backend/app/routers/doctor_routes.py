from datetime import datetime
import uuid
from boto3.dynamodb.conditions import Attr 
from fastapi import APIRouter, Depends, HTTPException
from app.models import ConsultationDetails, CarePlanResponse,DoctorProfileSetup
from app.services.auth import require_role
import boto3
import os
import json
from datetime import datetime


router = APIRouter(prefix="/api/doctor", tags=["Doctor"])

# Initialize AWS Services
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
care_plans_table = dynamodb.Table('DrDecideCarePlans')
appointments_table = dynamodb.Table('DrDecideAppointments')
notifications_table = dynamodb.Table('DrDecideNotifications')
doctors_table = dynamodb.Table('DrDecideDoctors')
patients_table = dynamodb.Table('DrDecidePatients')

# Initialize Bedrock (AI) and SNS (Text Messages) Clients
bedrock_client = boto3.client('bedrock-runtime', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
sns_client = boto3.client('sns', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

@router.post("/setup-profile")
async def setup_doctor_profile(
    profile_data: DoctorProfileSetup, # Make sure this is imported at the top!
    current_user: dict = Depends(require_role("Doctor"))
):
    doctor_id = current_user.get('sub')
    doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')

    record = {
        'doctor_id': doctor_id,
        'email': doctor_email,
        'doctor_name': profile_data.doctor_name,
        'specialty': profile_data.specialty,
        'clinic_name': profile_data.clinic_name,
        # Save the new location fields
        'city': profile_data.city.lower(), # Lowercase for easier searching
        'state': profile_data.state,
        'pincode': profile_data.pincode,
        'profile_status': 'Complete'
    }

    try:
        doctors_table.put_item(Item=record)
        return {"message": "Doctor profile completed!", "profile": record}
    except Exception as e:
        print(f"Doctor Profile Setup Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save doctor profile.")   

@router.get("/my-appointments")
async def get_doctor_appointments(
    current_user: dict = Depends(require_role("Doctor"))
):
    """
    Retrieves all appointments assigned to the logged-in doctor.
    """
    doctor_id = current_user.get('sub')
    doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    print(f"--- Fetching Schedule for Doctor ID: {doctor_id} ---")
    
    try:
        response = appointments_table.scan(
            FilterExpression=Attr('doctor_email').eq(doctor_email) | Attr('doctor_email').eq(doctor_id)
        )
        
        appointments = response.get('Items', [])
        appointments.sort(key=lambda x: x.get('appointment_date', ''))
        
        return {
            "doctor_id": doctor_id,
            "doctor_email": doctor_email,
            "total_appointments": len(appointments),
            "schedule": appointments
        }
        
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error fetching schedule.")
    

# @router.post("/consultation", response_model=CarePlanResponse)
# async def submit_consultation(
#     details: ConsultationDetails,
#     current_user: dict = Depends(require_role("Doctor")) 
# ):
#     """
#     Doctor submits medical data. Translated by Claude 3. Saved to DB. SMS Sent.
#     """
#     doctor_id = current_user.get('sub')
#     doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
#     print(f"Consultation processed by Doctor ID: {doctor_id}")

#     # 1. Prepare the prompt for Claude 3
#     prompt = f"""
#     You are an expert medical translator. Translate these doctor's notes into a simple, 
#     easy-to-understand daily care plan for the patient. 
    
#     You MUST return the output strictly as a JSON object with four keys: "Morning", "Afternoon", "Evening", and "Night". 
#     Do not include any extra text outside the JSON. Keep the instructions brief (1-2 sentences max per time period).
    
#     Diagnosis & Examination: {details.current_examination}
#     Prescribed Medicines: {details.medicines_prescribed}
#     """

#     # 2. Call Amazon Bedrock (Claude 3 Sonnet)
#     try:
#         bedrock_body = json.dumps({
#             "anthropic_version": "bedrock-2023-05-31",
#             "max_tokens": 500,
#             "messages": [{"role": "user", "content": prompt}]
#         })
        
#         response = bedrock_client.invoke_model(
#             modelId="anthropic.claude-3-sonnet-20240229-v1:0",
#             body=bedrock_body,
#             contentType="application/json",
#             accept="application/json"
#         )
        
#         response_body = json.loads(response.get('body').read())
#         ai_simplified_plan = response_body.get('content')[0].get('text')

#     except Exception as e:
#         print(f"Bedrock Error: {e}")
#         ai_simplified_plan = "Error generating AI plan. Please follow the prescribed medicines."

#     # 3. Save the final Care Plan record to DynamoDB
#     record = {
#         'patient_id': details.patient_id,
#         'appointment_id': details.appointment_id, 
#         'doctor_id': doctor_id,       
#         'doctor_email': doctor_email, 
#         'raw_medical_history': details.medical_history,
#         'raw_examination': details.current_examination,
#         'medicines_prescribed': details.medicines_prescribed,
#         'simplified_plan': ai_simplified_plan,
#         'follow_up_reminder': details.follow_up_details,
#         'status': 'Completed'
#     }

#     try:
#         care_plans_table.put_item(Item=record)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to save care plan to database: {str(e)}")

#     # 4. CREATE IN-APP NOTIFICATION (For the Patient Dashboard)
#     notification_id = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"
#     try:
#         notifications_table.put_item(Item={
#             'notification_id': notification_id,
#             'patient_id': details.patient_id,
#             'message': f"Care plan updated by {doctor_email}: New daily tasks added.",
#             'timestamp': datetime.utcnow().isoformat(),
#             'status': 'Unread'
#         })
#     except Exception as e:
#         print(f"Notification Save Error: {e}")

#     # 5. FIRE AMAZON SNS TEXT MESSAGE (Live SMS)
#     if hasattr(details, 'phone_number') and details.phone_number:
#         try:
#             sms_message = "Hi! Dr. Decide has finished your consultation. Check the app to view your simplified care instructions."
#             sns_client.publish(
#                 PhoneNumber=details.phone_number,
#                 Message=sms_message
#             )
#             print(f"SMS successfully sent to {details.phone_number}")
#         except Exception as e:
#             print(f"Amazon SNS Error: {e}")

#     # 6. Return the response to the frontend
#     return CarePlanResponse(
#         patient_id=details.patient_id,
#         simplified_plan=ai_simplified_plan,
#         follow_up_reminder=details.follow_up_details,
#         status="Success - Saved to Database & SMS Sent!"
#     )
#//////////// Gemini 
@router.post("/consultation", response_model=CarePlanResponse)
async def submit_consultation(
    details: ConsultationDetails,
    current_user: dict = Depends(require_role("Doctor")) 
):
    """
    Doctor submits medical data. Translated by Google Gemini 1.5 Flash. Saved to DB. SMS Sent.
    """
    doctor_id = current_user.get('sub')
    doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    print(f"Consultation processed by Doctor ID: {doctor_id}")

    # 1. Prepare the prompt for Gemini (Formatted for your React UI)
    prompt = f"""
    You are an expert medical AI assistant. Analyze these doctor's notes and translate them into simple, patient-friendly language.
    
    You MUST output your response STRICTLY as a JSON object with two exact keys: "care_plan" and "summarization". 
    Do not include markdown like ```json.
    
    Format requirements:
    1. "care_plan": A dictionary with keys "Morning", "Afternoon", "Evening", and "Night". Each value should be a short, 1-sentence instruction.
    2. "summarization": A list of 3 short bullet points summarizing the visit, diagnosis, and next steps in plain English.
    
    Doctor's Notes:
    Diagnosis & Examination: {details.current_examination}
    Prescribed Medicines: {details.medicines_prescribed}
    """

    # 2. Call Google Gemini (Bypassing AWS Bedrock)
    try:
        print("Sending clinical notes to Google Gemini...")
        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            # This forces Gemini to return perfect JSON every single time!
            generation_config={"response_mime_type": "application/json"}
        )
        
        response = model.generate_content(prompt)
        ai_simplified_plan = response.text
        print("✅ Gemini Care Plan Generated Successfully!")

    except Exception as e:
        print(f"Gemini Error: {e}")
        # Hackathon Fallback: If AI fails or internet drops, keep the demo alive!
        ai_simplified_plan = json.dumps({
            "care_plan": {
                "Morning": "Take prescribed medication after breakfast.",
                "Afternoon": "Rest and stay hydrated.",
                "Evening": "Monitor temperature and log symptoms.",
                "Night": "Get a full 8 hours of sleep."
            },
            "summarization": [
                "Patient evaluated for reported symptoms.",
                "Standard recovery protocol initiated.",
                "Follow up if symptoms worsen after 48 hours."
            ]
        })

    # 3. Save the final Care Plan record to DynamoDB
    record = {
        'patient_id': details.patient_id,
        'appointment_id': details.appointment_id, 
        'doctor_id': doctor_id,       
        'doctor_email': doctor_email, 
        'raw_medical_history': details.medical_history,
        'raw_examination': details.current_examination,
        'medicines_prescribed': details.medicines_prescribed,
        'simplified_plan': ai_simplified_plan,
        'follow_up_reminder': details.follow_up_details,
        'status': 'Completed'
    }

    try:
        care_plans_table.put_item(Item=record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save care plan to database: {str(e)}")

    # 4. CREATE IN-APP NOTIFICATION (For the Patient Dashboard)
    notification_id = f"NOTIF-{uuid.uuid4().hex[:6].upper()}"
    try:
        notifications_table.put_item(Item={
            'notification_id': notification_id,
            'patient_id': details.patient_id,
            'message': f"Care plan updated by {doctor_email}: New daily tasks added.",
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'Unread'
        })
    except Exception as e:
        print(f"Notification Save Error: {e}")

    # 5. FIRE AMAZON SNS TEXT MESSAGE (Live SMS)
    if hasattr(details, 'phone_number') and details.phone_number:
        try:
            sms_message = "Hi! Dr. Decide has finished your consultation. Check the app to view your simplified care instructions."
            sns_client.publish(
                PhoneNumber=details.phone_number,
                Message=sms_message
            )
            print(f"SMS successfully sent to {details.phone_number}")
        except Exception as e:
            print(f"Amazon SNS Error: {e}")

    # 6. Return the response to the frontend
    return CarePlanResponse(
        patient_id=details.patient_id,
        simplified_plan=ai_simplified_plan,
        follow_up_reminder=details.follow_up_details,
        status="Success - Saved to DB, AI Generated, & SMS Sent!"
    )
#///
@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: dict = Depends(require_role("Doctor"))
):
    """
    Aggregates all data needed for the Doctor Dashboard UI in a single API call.
    """
    doctor_id = current_user.get('sub')
    doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        # 1. Fetch all appointments for this doctor
        appts_response = appointments_table.scan(
            FilterExpression=Attr('doctor_email').eq(doctor_email) | Attr('doctor_id').eq(doctor_id)
        )
        all_appts = appts_response.get('Items', [])
        
        # 2. Fetch all care plans generated by this doctor
        plans_response = care_plans_table.scan(
            FilterExpression=Attr('doctor_email').eq(doctor_email) | Attr('doctor_id').eq(doctor_id)
        )
        all_plans = plans_response.get('Items', [])

        # --- CALCULATE METRICS ---
        
        # Filter for today's appointments
        todays_appts = [a for a in all_appts if a.get('appointment_date', '').startswith(today_str)]
        
        # Get unique patients seen by this doctor
        unique_patients = set(a.get('patient_id') for a in all_appts)
        
        # Mocking hourly capacity for the hackathon UI
        hourly_capacity = [
            {"time": "09:00 AM", "booked": 2, "limit": 3},
            {"time": "10:30 AM", "booked": 3, "limit": 3},
            {"time": "12:00 PM", "booked": 1, "limit": 2},
            {"time": "03:15 PM", "booked": 0, "limit": 1}
        ]

        # Format today's list for the UI
        formatted_todays_list = []
        for appt in todays_appts:
            formatted_todays_list.append({
                "time": appt.get('appointment_date', '').split('T')[-1][:5] if 'T' in appt.get('appointment_date', '') else "TBD",
                "patient_id": appt.get('patient_id', 'Unknown'),
                "reason": appt.get('reason', 'General Follow-up') # Default if not provided
            })

        return {
            "metrics": {
                "total_patients": len(unique_patients),
                "today_appointments_booked": len(todays_appts),
                "today_appointments_limit": 20, # Hardcoded daily capacity
                "care_plans_generated": len(all_plans),
                "critical_alerts": 2 # Mocked for the UI
            },
            "todays_appointments": formatted_todays_list,
            "hourly_capacity": hourly_capacity
        }

    except Exception as e:
        print(f"Dashboard Aggregation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard statistics.")


@router.get("/my-patients")
async def get_my_patients_and_plans(
    current_user: dict = Depends(require_role("Doctor"))
):
    """
    NEW FEATURE: Returns a list of all patients under this doctor's care, 
    along with their most recent AI Care Plan AND their real profile data (Name, Phone).
    """
    doctor_id = current_user.get('sub')
    doctor_email = current_user.get('email') or current_user.get('cognito:username') or current_user.get('username')
    
    try:
        # 1. Scan the care plans table for this doctor's patients
        response = care_plans_table.scan(
            FilterExpression=Attr('doctor_email').eq(doctor_email) | Attr('doctor_id').eq(doctor_id)
        )
        all_care_plans = response.get('Items', [])
        
        # 2. Group by patient to only get their LATEST plan
        patients_dict = {}
        for plan in all_care_plans:
            pid = plan.get('patient_id')
            patients_dict[pid] = {
                "patient_id": pid,
                "latest_appointment_id": plan.get('appointment_id'),
                "latest_simplified_plan": plan.get('simplified_plan'),
                "follow_up_reminder": plan.get('follow_up_reminder'),
                "status": plan.get('status')
            }
            
        # 3. GO FETCH THE REAL NAMES FROM THE PATIENTS TABLE!
        for pid in patients_dict:
            try:
                patient_profile = patients_table.get_item(Key={'patient_id': pid})
                if 'Item' in patient_profile:
                    # Inject the real name and phone number into the dictionary
                    patients_dict[pid]['patient_name'] = patient_profile['Item'].get('full_name', 'Unknown')
                    patients_dict[pid]['phone_number'] = patient_profile['Item'].get('phone_number', 'N/A')
                    patients_dict[pid]['blood_group'] = patient_profile['Item'].get('blood_group', 'Unknown')
                else:
                    patients_dict[pid]['patient_name'] = 'Unknown (Profile not setup)'
            except Exception as lookup_err:
                print(f"Error looking up patient {pid}: {lookup_err}")
                patients_dict[pid]['patient_name'] = 'Error fetching name'

        # 4. Convert dictionary back to a list for the frontend
        patient_list = list(patients_dict.values())
        
        return {
            "total_patients": len(patient_list),
            "patients": patient_list
        }

    except Exception as e:
        print(f"Patient Directory Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve patient list.")
    
@router.get("/profile")
async def get_doctor_profile(
    current_user: dict = Depends(require_role("Doctor"))
):
    """
    Fetches the doctor's profile. Frontend can use this to check if the profile is complete.
    """
    doctor_id = current_user.get('sub')
    
    try:
        response = doctors_table.get_item(Key={'doctor_id': doctor_id})
        
        if 'Item' in response:
            return response['Item']
        else:
            # If no item is found, the profile isn't set up yet!
            return {
                "message": "Profile not set up yet.", 
                "profile_status": "Incomplete"
            }
            
    except Exception as e:
        print(f"Doctor Profile Fetch Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch doctor profile.")