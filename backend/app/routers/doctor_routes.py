from fastapi import APIRouter, Depends, HTTPException
from app.models import ConsultationDetails, CarePlanResponse
from app.services.auth import verify_cognito_token
import boto3
import os
import json

router = APIRouter(prefix="/api/doctor", tags=["Doctor"])

# Initialize AWS Services
dynamodb = boto3.resource('dynamodb', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
care_plans_table = dynamodb.Table('DrDecideCarePlans')

# Initialize Bedrock Client for Claude 3
bedrock_client = boto3.client('bedrock-runtime', region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))

@router.post("/consultation", response_model=CarePlanResponse)
async def submit_consultation(
    details: ConsultationDetails
    # Auth is currently disabled for testing
    # current_user: dict = Depends(verify_cognito_token) 
):
    """
    Doctor submits medical data. Translated by Claude 3. Saved to DynamoDB.
    """
    # Since Auth is turned off, we will hardcode a fake doctor email for DynamoDB
    doctor_email = 'Dr.Test@example.com' 
    print(f"Request processed for: {doctor_email}")

    # 1. Prepare the prompt for Claude 3
    prompt = f"""
    You are an expert medical translator. Translate these doctor's notes into a simple, 
    easy-to-understand daily care plan for the patient. Avoid complex medical jargon.
    
    Diagnosis & Examination: {details.current_examination}
    Prescribed Medicines: {details.medicines_prescribed}
    """

    # 2. Call Amazon Bedrock (Claude 3 Sonnet)
    try:
        bedrock_body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 500,
            "messages": [{"role": "user", "content": prompt}]
        })
        
        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=bedrock_body,
            contentType="application/json",
            accept="application/json"
        )
        
        response_body = json.loads(response.get('body').read())
        ai_simplified_plan = response_body.get('content')[0].get('text')

    except Exception as e:
        print(f"Bedrock Error: {e}")
        ai_simplified_plan = "Error generating AI plan. Please follow the prescribed medicines."

    # 3. Save the final record to DynamoDB
    record = {
        'patient_id': details.patient_id,
        'appointment_id': details.appointment_id, # <-- Now grabbing this directly from your JSON body!
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

    # 4. Return the response to the frontend
    return CarePlanResponse(
        patient_id=details.patient_id,
        simplified_plan=ai_simplified_plan,
        follow_up_reminder=details.follow_up_details,
        status="Success - Saved to Database"
    )