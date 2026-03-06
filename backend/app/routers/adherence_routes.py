from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, date
import uuid
import os
import boto3
from boto3.dynamodb.conditions import Key

router = APIRouter(prefix="/api/adherence", tags=["Adherence & Recovery"])

class TaskLogRequest(BaseModel):
    appointment_id: str
    patient_id: str
    task_id: str      # e.g., "Morning"
    task_title: str   # e.g., "Take Paracetamol"
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
adherence_logs_table = dynamodb.Table('DrDecideAdherenceLogs') 


@router.post("/log")
async def log_daily_task(req: TaskLogRequest):
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
    """Doctor views the patient's adherence score."""
    try:
        # 1. Fetch all logs for this appointment (Requires a GSI on appointment_id)
        response = adherence_logs_table.query(
            IndexName='appointment_id-index',
            KeyConditionExpression=Key('appointment_id').eq(appointment_id)
        )
        logs = response.get('Items', [])
        
        # 2. Get today's completed tasks (for the patient UI)
        today_str = date.today().isoformat()
        todays_logs = [log['task_id'] for log in logs if log['date_logged'] == today_str]
        
        # 3. Calculate Overall Adherence (Simple Version)
        # Assuming 4 tasks a day (Morning, Afternoon, Evening, Night)
        total_completed = len(logs)
        
        # For a real app, calculate days between appointment_date and today
        # Here we mock 'expected_tasks' for demonstration
        expected_tasks = 20 # e.g., 5 days * 4 tasks
        
        adherence_percentage = min(int((total_completed / expected_tasks) * 100), 100) if expected_tasks > 0 else 0
        
        status_text = "Excellent Recovery" if adherence_percentage >= 80 else "Needs Attention" if adherence_percentage < 50 else "On Track"

        return {
            "appointment_id": appointment_id,
            "total_completed": total_completed,
            "adherence_percentage": adherence_percentage,
            "recovery_status": status_text,
            "todays_completed_tasks": todays_logs # Array of IDs like ["Morning", "Evening"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))