from fastapi import APIRouter, HTTPException
from app.models import QueueToken
import boto3
import os
import random

router = APIRouter(prefix="/api/hospital", tags=["Hospital & Queue"])

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
queue_table = dynamodb.Table('DrDecideQueue')
patients_table = dynamodb.Table('DrDecidePatients')
appointment_table = dynamodb.Table('DrDecideAppointments')


@router.get("/search-patient")
async def search_patient(full_name: str):
    """
    Search patient directory by full_name and return patient_id + appointment_id.
    """
    try:
        response = patients_table.scan(
            FilterExpression="contains(#fn, :full_name)",
            ExpressionAttributeNames={"#fn": "full_name"},
            ExpressionAttributeValues={":full_name": full_name}
        )
        return {"patients": response.get("Items", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search patient directory: {str(e)}")


@router.post("/check-in/{patient_id}", response_model=QueueToken)
@router.post("/check-in/{patient_id}", response_model=QueueToken)
async def generate_queue_token(patient_id: str, appointment_id: str):
    """
    Patient arrives at the hospital, receives a sequential queue token, and is saved to DynamoDB.
    """
    try:
        # Get the current max token number
        response = queue_table.scan(
            ProjectionExpression="token_number"
        )
        items = response.get("Items", [])
        
        if items:
            max_token = max(int(item["token_number"]) for item in items)
        else:
            max_token = 0  # First patient in queue

        assigned_token = max_token + 1

        token_data = {
            "patient_id": patient_id,
            "appointment_id": appointment_id,
            "token_number": assigned_token,
            "status": "Waiting"
        }

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

@router.get("/appointment/{appointment_id}")
async def get_patient_from_appointment(appointment_id: str):
    """
    Fetch patient_id and full_name using appointment_id from the Appointment table.
    """
    try:
        response = appointment_table.scan(
            FilterExpression="#aid = :appointment_id",
            ExpressionAttributeNames={"#aid": "appointment_id"},
            ExpressionAttributeValues={":appointment_id": appointment_id}
        )
        items = response.get("Items", [])
        if not items:
            raise HTTPException(status_code=404, detail="No appointment found with this ID")

        # Assuming appointment_id is unique, return the first match
        appointment = items[0]
        return {
            "patient_id": appointment.get("patient_id"),
            "full_name": appointment.get( "patient_name"),
            "doctor_id": appointment.get("doctor_id"),
            "appointment_id": appointment.get("appointment_id")
        } 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
