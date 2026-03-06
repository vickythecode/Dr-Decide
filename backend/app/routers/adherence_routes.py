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
patient_table = dynamodb.Table('DrDecidePatients')


@router.post("/log")
async def log_daily_task(req: TaskLogRequest):
    """Patient clicks 'Mark Done' for a specific time of day."""
    today_str = date.today().isoformat()
    log_id = f"{req.appointment_id}#{req.task_id}#{today_str}"
    
    record = {
        "log_id": log_id, 
        "appointment_id": req.appointment_id, 
        "doctor_id": req.doctor_id, 
        "patient_id": req.patient_id,
        "task_id": req.task_id,
        "task_title": req.task_title,
        "date_logged": today_str,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "Done"
    }
    
    try:
        adherence_logs_table.put_item(Item=record)
        return {"message": "Task logged for today", "log": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    """Patient clicks 'Mark Done' for a specific time of day."""
    today_str = date.today().isoformat() # e.g., "2026-03-05"
    log_id = f"{req.appointment_id}#{req.task_id}#{today_str}"
    
    record = {
        "log_id": log_id, # Partition Key
        "appointment_id": req.appointment_id, # GSI for doctor to search
        "patient_id": req.patient_id,
        "task_id": req.task_id,
        "task_title": req.task_title,
        "date_logged": today_str,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "Done"
    }
    
    try:
        # Assuming you have initialized adherence_logs_table
        adherence_logs_table.put_item(Item=record)
        return {"message": "Task logged for today", "log": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/{appointment_id}")
async def get_patient_recovery_status(appointment_id: str):
    try:
        # 1. Fetch all logs for this appointment
        response = adherence_logs_table.query(
            IndexName='appointment_id-index',
            KeyConditionExpression=Key('appointment_id').eq(appointment_id)
        )
        logs = response.get('Items', [])
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # 2. Extract Patient ID (The Fix is here)
        patient_id = "Unknown"
        if logs:
            patient_id = logs[0].get('patient_id')
        else:
            # FIX: If no logs exist, find the patient_id from the original appointment
            # Replace 'appointments_table' with your actual Appointments table variable name
            appt_response = appointments_table.get_item(Key={'appointment_id': appointment_id})
            appt_item = appt_response.get('Item')
            if appt_item:
                patient_id = appt_item.get('patient_id', 'Unknown')

        # 3. Fetch Patient Name
        patient_name = "Unknown Patient"
        if patient_id != "Unknown":
            p_item = patient_table.get_item(
                Key={'patient_id': patient_id},
                ProjectionExpression='full_name'
            ).get('Item', {})
            patient_name = p_item.get('full_name', 'Unknown Patient')

        # 4. Calculate Stats (Same as before)
        total_completed = len(logs)
        expected_tasks = 20 
        adherence_percentage = min(int((total_completed / expected_tasks) * 100), 100) if expected_tasks > 0 else 0
        
        if adherence_percentage >= 75:
            status_text = "On Track"
        elif adherence_percentage >= 50:
            status_text = "Needs Attention"
        else:
            status_text = "Critical"

        today_str = date.today().isoformat()
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
            "adherence_percentage": adherence_percentage,
            "status": status_text,
            "last_active": last_active,
            "recent_logs": recent_logs_formatted,
            "todays_completed_tasks": todays_logs 
        }
    except Exception as e:
        print(f"Error fetching stats for {appointment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    """Doctor views the patient's adherence score and recent activity."""
    try:
        # 1. Fetch all logs for this appointment
        response = adherence_logs_table.query(
            IndexName='appointment_id-index',
            KeyConditionExpression=Key('appointment_id').eq(appointment_id)
        )
        logs = response.get('Items', [])
        
        # 2. Sort logs by timestamp descending (newest first)
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # 3. Get today's completed tasks
        today_str = date.today().isoformat()
        todays_logs = [log['task_id'] for log in logs if log.get('date_logged') == today_str]
        
        # 4. Calculate Overall Adherence
        total_completed = len(logs)
        expected_tasks = 20 
        adherence_percentage = min(int((total_completed / expected_tasks) * 100), 100) if expected_tasks > 0 else 0
        
        if adherence_percentage >= 75:
            status_text = "On Track"
        elif adherence_percentage >= 50:
            status_text = "Needs Attention"
        else:
            status_text = "Critical"

        # 5. Extract IDs and FETCH PATIENT NAME
        patient_id = "Unknown"
        patient_name = "Unknown Patient"

        if logs:
            patient_id = logs[0].get('patient_id', 'Unknown')
        else:
            # OPTIONAL: If no logs exist, you might want to query your 
            # Appointments table here to get the patient_id associated with this appt.
            pass

        # Fetch the name from the patient_table
        if patient_id != "Unknown":
            p_item = patient_table.get_item(
                Key={'patient_id': patient_id},
                ProjectionExpression='patient_name'
            ).get('Item', {})
            patient_name = p_item.get('patient_name', 'Unknown Patient')

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
            "patient_name": patient_name, # <-- Successfully Synced
            "total_completed": total_completed,
            "adherence_percentage": adherence_percentage,
            "status": status_text,
            "last_active": last_active,
            "recent_logs": recent_logs_formatted,
            "todays_completed_tasks": todays_logs 
        }
    except Exception as e:
        print(f"Error fetching stats for {appointment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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