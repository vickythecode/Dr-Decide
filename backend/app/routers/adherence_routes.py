from fastapi import APIRouter, HTTPException, Depends
from app.services.auth import require_role
from pydantic import BaseModel
from datetime import datetime, date
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

# --- 2. DOCTOR ACTION: VIEWING ADHERENCE MATH ---
@router.get("/stats/{appointment_id}")
async def get_patient_recovery_status(appointment_id: str):
    """Calculates adherence % based on elapsed days and daily tasks."""
    try:
        # 1. Fetch all logs for this specific care plan
        response = adherence_logs_table.query(
            IndexName='appointment_id-index', # Make sure you have this GSI in DynamoDB!
            KeyConditionExpression=Key('appointment_id').eq(appointment_id)
        )
        logs = response.get('Items', [])
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # 2. Fetch the Care Plan to get the baseline math variables
        plan_response = care_plans_table.get_item(Key={'appointment_id': appointment_id})
        plan = plan_response.get('Item')
        
        if not plan:
            raise HTTPException(status_code=404, detail="Care plan not found.")

        # Extract math variables
        today = date.today()
        start_date_str = plan.get('created_at', today.isoformat())[:10]
        follow_up_date_str = plan.get('follow_up_date', today.isoformat())[:10]
        tasks_per_day = int(plan.get('daily_task_count', 4))
        patient_id = plan.get('patient_id')
        
        # 3. Perform Date Math
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        follow_up_date = datetime.strptime(follow_up_date_str, "%Y-%m-%d").date()
        
        # Stop expecting new tasks if the follow-up date has passed
        calc_end_date = min(today, follow_up_date) 
        
        # Calculate days elapsed (including day 1)
        days_elapsed = (calc_end_date - start_date).days + 1
        if days_elapsed < 1: 
            days_elapsed = 1
            
        expected_tasks_to_date = days_elapsed * tasks_per_day
        total_completed = len(logs)

        # 4. Calculate Percentage & Status Color
        if expected_tasks_to_date > 0:
            adherence_percentage = min(int((total_completed / expected_tasks_to_date) * 100), 100)
        else:
            adherence_percentage = 0

        if adherence_percentage >= 75: status_text = "On Track"
        elif adherence_percentage >= 50: status_text = "Needs Attention"
        else: status_text = "Critical"

        # 5. Extract today's tasks for the Patient UI progress bar
        today_str = today.isoformat()
        todays_logs = [log['task_id'] for log in logs if log.get('date_logged') == today_str]

        # 6. Fetch the patient name for the Doctor UI
        patient_name = "Unknown Patient"
        try:
            p_item = patient_table.get_item(Key={'patient_id': patient_id}).get('Item', {})
            patient_name = p_item.get('patient_name', 'Unknown Patient')
        except:
            pass

        # Format recent logs for the timeline
        recent_logs_formatted = [
            {"id": log.get("log_id"), "task_title": log.get("task_title"), "logged_at": log.get("timestamp")}
            for log in logs[:10]
        ]

        return {
            "appointment_id": appointment_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "follow_up_date": follow_up_date_str,
            "days_elapsed": days_elapsed,
            "total_completed": total_completed,
            "expected_tasks_to_date": expected_tasks_to_date,
            "adherence_percentage": adherence_percentage,
            "status": status_text,
            "last_active": logs[0].get('timestamp') if logs else None,
            "recent_logs": recent_logs_formatted,
            "todays_completed_tasks": todays_logs # Used by the Patient UI
        }
    except Exception as e:
        print(f"Error fetching stats for {appointment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/all-stats/") 
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