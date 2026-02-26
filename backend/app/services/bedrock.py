import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def generate_comprehensive_care_plan(details: dict) -> dict:
    """
    Uses Claude 3 via Amazon Bedrock to translate detailed clinical notes into a plain-language plan.
    """
    prompt = f"""
    You are 'Dr. Decide', an AI assistant. Translate the following clinical consultation into a plain-language, highly actionable daily checklist for the patient. 
    IMPORTANT SAFETY RULE: This must be strictly educational and non-diagnostic.

    Medical History: {details['medical_history']}
    Current Examination: {details['current_examination']}
    Medicines Prescribed: {details['medicines_prescribed']}
    Follow-up Details: {details['follow_up_details']}
    
    Format your response as a JSON object with two keys:
    1. "simplified_plan": A bulleted, jargon-free daily action plan.
    2. "follow_up_reminder": A clear sentence stating exactly when and why they need to return.
    """
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}]
    })
    
    try:
        response = bedrock_runtime.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0", 
            body=body
        )
        response_body = json.loads(response.get('body').read())
        # Claude returns a JSON string inside its text response based on our prompt
        ai_output = json.loads(response_body['content'][0]['text']) 
        return ai_output
    except Exception as e:
        print(f"Bedrock Error: {e}")
        return {"simplified_plan": "Error generating plan.", "follow_up_reminder": ""}