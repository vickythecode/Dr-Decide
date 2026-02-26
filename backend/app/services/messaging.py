import boto3

sns_client = boto3.client('sns', region_name='us-east-1')

def trigger_immediate_reminder(phone_number: str, message: str):
    """
    Sends an immediate SMS via Amazon SNS. 
    In a full production environment, EventBridge would trigger a Lambda 
    function that calls this SNS topic on a schedule[cite: 75, 76, 77, 80].
    """
    try:
        response = sns_client.publish(
            PhoneNumber=phone_number,
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                }
            }
        )
        return response['MessageId']
    except Exception as e:
        print(f"SNS Error: {e}")
        return None