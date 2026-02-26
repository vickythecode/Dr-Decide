import boto3
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table_name = 'DrDecideCarePlans'

def store_care_plan(patient_id: str, raw_notes: str, plain_plan: str):
    """
    Stores the finalized care plan in Amazon DynamoDB.
    """
    try:
        table = dynamodb.Table(table_name)
        table.put_item(
            Item={
                'patient_id': patient_id,
                'timestamp': int(time.time()),
                'raw_notes': raw_notes,
                'plain_plan': plain_plan,
                'adherence_score': 0 # For Phase 3 Monitoring [cite: 61]
            }
        )
        return True
    except Exception as e:
        print(f"DynamoDB Error: {e}")
        return False
# ... (keep your existing imports and store_care_plan function) ...

def get_patient_plan(patient_id: str):
    """
    Fetches the patient's care plan from DynamoDB.
    """
    try:
        table = dynamodb.Table(table_name)
        # Assuming patient_id is the primary partition key
        response = table.get_item(Key={'patient_id': patient_id})
        return response.get('Item')
    except Exception as e:
        print(f"DynamoDB Read Error: {e}")
        return None

def update_adherence(patient_id: str):
    """
    Increments the patient's adherence score in DynamoDB when they complete a task.
    """
    try:
        table = dynamodb.Table(table_name)
        # Atomically adds 1 to the adherence_score without reading it first
        response = table.update_item(
            Key={'patient_id': patient_id},
            UpdateExpression="ADD adherence_score :inc",
            ExpressionAttributeValues={':inc': 1},
            ReturnValues="UPDATED_NEW"
        )
        return True
    except Exception as e:
        print(f"DynamoDB Update Error: {e}")
        return False