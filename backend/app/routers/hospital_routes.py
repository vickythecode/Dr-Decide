from fastapi import APIRouter, HTTPException
from app.models import QueueToken
import boto3
import os
import random

router = APIRouter(prefix="/api/hospital", tags=["Hospital & Queue"])

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
queue_table = dynamodb.Table('DrDecideQueue')

@router.post("/check-in/{patient_id}", response_model=QueueToken)
async def generate_queue_token(patient_id: str, appointment_id: str):
    """
    Patient arrives at the hospital, receives a queue token, and is saved to DynamoDB.
    """
    # For a hackathon, a random token number works perfectly
    assigned_token = random.randint(1, 100) 
    
    token_data = {
        'patient_id': patient_id,
        'appointment_id': appointment_id,
        'token_number': assigned_token,
        'status': 'Waiting'
    }

    try:
        # Save to AWS DynamoDB
        queue_table.put_item(Item=token_data)
        return token_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save to DynamoDB: {str(e)}")

@router.get("/queue-status")
async def get_queue_status():
    """
    Fetches all patients currently waiting in the hospital (for the TV screen).
    """
    try:
        # Scans the table to get everyone in the queue
        response = queue_table.scan()
        return {"current_queue": response.get('Items', [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")