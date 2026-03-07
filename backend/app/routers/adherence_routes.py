from fastapi import APIRouter, HTTPException, Depends
from app.services.auth import require_role
from pydantic import BaseModel
from datetime import datetime, date, timedelta,timezone
import uuid
import os
import boto3
from boto3.dynamodb.conditions import Key

router = APIRouter(prefix="/api/adherence", tags=["Adherence & Recovery"])

class TaskLogRequest(BaseModel):
    appointment_id: str
    doctor_id: str
    patient_id: str
    task_id: str      # e.g., "Morning"
    task_title: str   # e.g., "Take Paracetamol"
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
adherence_logs_table = dynamodb.Table('DrDecideAdherenceLogs')
appointments_table = dynamodb.Table('DrDecideAppointments')
care_plans_table = dynamodb.Table('DrDecideCarePlans')
patient_table = dynamodb.Table('DrDecidePatients')


@router.post("/log")
async def log_task_completion(request: TaskLogRequest):
    """Patient clicks 'Mark Done' on a daily task."""
    try:
        now = datetime.utcnow()
        today_str = date.today().isoformat()
        log_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
        
        log_item = {
            'log_id': log_id, # Primary Key
            'appointment_id': request.appointment_id, # Global Secondary Index for fast querying
            'patient_id': request.patient_id,
            'doctor_id': request.doctor_id,
            'task_id': request.task_id,
            'task_title': request.task_title,
            'timestamp': now.isoformat(),
            'date_logged': today_str # Storing the date makes fetching "Today's tasks" very fast
        }
        
        adherence_logs_table.put_item(Item=log_item)
        
        return {"message": "Task logged successfully", "log_id": log_id}
        
    except Exception as e:
        print(f"Error logging task: {e}")
        raise HTTPException(status_code=500, detail="Failed to log task completion.")




@router.get("/stats/{appointment_id}")
async def get_patient_recovery_status(appointment_id: str):
    try:
        # 1. Fetch all completed task logs
        response = adherence_logs_table.query(
            IndexName='appointment_id-index',
            KeyConditionExpression=Key('appointment_id').eq(appointment_id)
        )
        logs = response.get('Items', [])
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # 2. FIND THE PATIENT ID FIRST (From logs or appointments table)
        patient_id = "Unknown"
        if logs:
            patient_id = logs[0].get('patient_id')
        
        if not patient_id or patient_id == "Unknown":
            appt_response = appointments_table.get_item(Key={'appointment_id': appointment_id})
            appt_item = appt_response.get('Item')
            if appt_item:
                patient_id = appt_item.get('patient_id', 'Unknown')
                
        if patient_id == "Unknown":
            raise HTTPException(status_code=404, detail="Could not find patient associated with this appointment.")

        # 3. FETCH THE CARE PLAN (Using the correct partition key!)
        try:
            # We use query instead of get_item just in case you also have a Sort Key
            plan_response = care_plans_table.query(
                KeyConditionExpression=Key('patient_id').eq(patient_id)
            )
            # Find the specific plan for this appointment, or default to the most recent one
            all_plans = plan_response.get('Items', [])
            plan_item = next((p for p in all_plans if p.get('appointment_id') == appointment_id), None)
            print(f"DEBUG: Found {len(all_plans)} plans for patient_id {patient_id}, selected plan: {plan_item}")
            if not plan_item and all_plans:
                plan_item = all_plans[0] # Fallback if appointment_id wasn't saved perfectly
                
        except Exception as e:
            print(f"AWS Error fetching Care Plan: {e}")
            raise HTTPException(status_code=500, detail="Care Plan table schema mismatch.")

        if not plan_item:
            raise HTTPException(status_code=404, detail="Care plan not found.")

        # 4. FETCH PATIENT NAME
        patient_name = "Unknown Patient"
        try:
            p_item = patient_table.get_item(
                Key={'patient_id': patient_id},
                ProjectionExpression='full_name' # Your actual column name
            ).get('Item', {})
            patient_name = p_item.get('full_name', 'Unknown Patient')
        except Exception as e:
            print(f"Error fetching patient name: {e}")

        # ==========================================
        # 5. CALCULATE STATS (EXPECTED TASK LOGIC)
        # ==========================================
        IST = timezone(timedelta(hours=5, minutes=30))
        today = datetime.now(IST).date()
        total_completed = len(logs)
        
        # Extract dates safely
        created_str = str(plan_item.get('created_date') or plan_item.get('created_at', today.isoformat()))[:10]
        
        follow_up_str = str(plan_item.get('follow_up_date', today.isoformat()))[:10]
        
        
        # Safely extract tasks_per_day
        try:
            tasks_per_day = int(plan_item.get('daily_task_count', 4))
        except (TypeError, ValueError):
            tasks_per_day = 4
        
        consultation_date = datetime.strptime(created_str, "%Y-%m-%d").date()
        follow_up_date = datetime.strptime(follow_up_str, "%Y-%m-%d").date()
        
        # Tracking starts the day AFTER the consultation
        start_date = consultation_date + timedelta(days=1)
        # Stop expecting new tasks if the follow-up date has passed
        calc_end_date = min(today, follow_up_date)
        
        if today < start_date:
            # Day 0: Plan was made today. No penalties yet.
            days_elapsed = 0
            expected_tasks = 0
            adherence_percentage = 0 
            status_text = "Starts Tomorrow"
        else:
            # Calculate exactly how many tasks they SHOULD have done by today
            days_elapsed = (calc_end_date - start_date).days + 1
            expected_tasks = days_elapsed * tasks_per_day
            
            # The actual percentage math
            if expected_tasks > 0:
                adherence_percentage = min(int((total_completed / expected_tasks) * 100), 100)
            else:
                adherence_percentage = 0
                
            if adherence_percentage >= 75:
                status_text = "On Track"
            elif adherence_percentage >= 50:
                status_text = "Needs Attention"
            else:
                status_text = "Critical"

        # 6. FORMAT OUTPUTS FOR NEXT.JS
        today_str = today.isoformat()
        todays_logs = [log['task_id'] for log in logs if log.get('date_logged') == today_str]
        last_active = logs[0].get('timestamp') if logs else None
        
        recent_logs_formatted = [
            {
                "id": log.get("log_id"),
                "task_title": log.get("task_title", "Unknown Task"),
                "logged_at": log.get("timestamp")
            }
            for log in logs[:10]
        ]

        return {
            "appointment_id": appointment_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "total_completed": total_completed,
            "expected_tasks": expected_tasks, 
            "adherence_percentage": adherence_percentage,
            "status": status_text,
            "last_active": last_active,
            "recent_logs": recent_logs_formatted,
            "todays_completed_tasks": todays_logs,
            "simplified_plan": plan_item.get('simplified_plan', '{}') # Ensure the doctor can see the checklist!
        }
    except Exception as e:
        print(f"Error fetching stats for {appointment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    
@router.get("/all-stats") 
async def get_all_patients_summary(current_user: dict = Depends(require_role("Doctor"))):
    try:
        doctor_id = current_user['sub'] 
        
        # 1. Fetch all logs for this doctor
        response = adherence_logs_table.query(
            IndexName='doctor_id-index',
            KeyConditionExpression=Key('doctor_id').eq(doctor_id)
        )
        all_logs = response.get('Items', [])
        
        if not all_logs:
            return []

        # 2. Group logs by appointment_id and collect unique patient_ids
        grouped_data = {}
        patient_ids_to_fetch = set()

        for log in all_logs:
            appt_id = log.get('appointment_id')
            p_id = log.get('patient_id', 'Unknown')
            
            if appt_id not in grouped_data:
                patient_ids_to_fetch.add(p_id)
                grouped_data[appt_id] = {
                    "appointment_id": appt_id,
                    "patient_id": p_id,
                    "total_completed": 0,
                    "last_active": log.get('timestamp')
                }
            
            grouped_data[appt_id]["total_completed"] += 1
            
            # Update last active if this log is newer
            if log.get('timestamp') > grouped_data[appt_id]["last_active"]:
                grouped_data[appt_id]["last_active"] = log.get('timestamp')

        # 3. Fetch Patient Names in bulk (or one-by-one per unique patient, not per log)
        # Optimization: Create a map of {patient_id: patient_name}
        patient_name_map = {}
        for p_id in patient_ids_to_fetch:
            if p_id == "Unknown": continue
            # This only runs ONCE per patient, not per log record
            p_item = patient_table.get_item(
                Key={'patient_id': p_id}, 
                ProjectionExpression='full_name'
            ).get('Item', {})
            patient_name_map[p_id] = p_item.get('full_name', 'Unknown User')

        # 4. Calculate percentages and build the summary list
        summaries = []
        expected_tasks = 20 # Mocked
        
        for appt_id, data in grouped_data.items():
            percentage = min(int((data["total_completed"] / expected_tasks) * 100), 100)
            
            # Determine Status
            if percentage >= 75: status = "On Track"
            elif percentage >= 50: status = "Needs Attention"
            else: status = "Critical"
                
            summaries.append({
                "appointment_id": appt_id,
                "patient_id": data["patient_id"],
                "patient_name": patient_name_map.get(data["patient_id"], "Unknown"),
                "adherence_percentage": percentage,
                "status": status,
                "last_active": data["last_active"]
            })
            
        # 5. Sort: Critical/Needs Attention (lowest percentage) first
        summaries.sort(key=lambda x: x["adherence_percentage"])

        return summaries

    except Exception as e:
        print(f"Error in all-stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")