import boto3
import os
from dotenv import load_dotenv

# 1. MUST BE AT THE VERY TOP: Load environment variables first!
load_dotenv()

# 2. Initialize AWS Clients
region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
dynamodb = boto3.resource('dynamodb', region_name=region)
doctors_table = dynamodb.Table('DrDecideDoctors')
cognito_client = boto3.client('cognito-idp', region_name=region)

# Make sure these are set in your .env file!
CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")

if not CLIENT_ID:
    print("🚨 ERROR: COGNITO_APP_CLIENT_ID is missing from your .env file!")
    exit(1)

# 3. Our List of Dummy Users
dummy_users = [
    {
        "email": "priya.nair@drdecide.com",
        "password": "Password123!",
        "name": "Dr. Priya Nair",
        "role": "Doctor",
        "specialty": "Cardiology",
        "clinic_name": "City Heart Hospital"
    },
    {
        "email": "rahul.menon@drdecide.com",
        "password": "Password123!",
        "name": "Dr. Rahul Menon",
        "role": "Doctor",
        "specialty": "General Medicine",
        "clinic_name": "Wellness Clinic"
    },
    # --- ADDING A PATIENT USER FOR YOU TO TEST WITH ---
    {
        "email": "patient@drdecide.com",
        "password": "Password123!",
        "name": "Test Patient",
        "role": "Patient"
    }
]

def seed_database():
    print("🚀 Starting User Initialization Sequence...\n")
    
    for user in dummy_users:
        try:
            # STEP A: Create the Cognito User
            response = cognito_client.sign_up(
                ClientId=CLIENT_ID,
                Username=user['email'],
                Password=user['password'],
                UserAttributes=[
                    {'Name': 'email', 'Value': user['email']},
                    {'Name': 'custom:role', 'Value': user['role']}
                ]
            )
            
            # Grab the permanent AWS UUID
            user_sub_id = response['UserSub']
            print(f"✅ Created Cognito Account for {user['name']} (Role: {user['role']})")

            # STEP B: Auto-Confirm the email
            if USER_POOL_ID:
                cognito_client.admin_confirm_sign_up(
                    UserPoolId=USER_POOL_ID,
                    Username=user['email']
                )
                print(f"   -> Email auto-verified!")

            # STEP C: If it's a Doctor, save them to the Directory Table
            if user['role'] == "Doctor":
                db_record = {
                    "doctor_id": user_sub_id, 
                    "doctor_email": user['email'],
                    "doctor_name": user['name'],
                    "specialty": user['specialty'],
                    "clinic_name": user['clinic_name']
                }
                doctors_table.put_item(Item=db_record)
                print(f"   -> Saved to DynamoDB Doctor Directory!\n")
            else:
                print(f"   -> Patient user ready to go!\n")
            
        except cognito_client.exceptions.UsernameExistsException:
            print(f"⏭️  Skipping {user['name']}: User already exists in Cognito.\n")
        except Exception as e:
            print(f"❌ Failed to process {user['name']}: {e}\n")
            
    print("🎉 System Ready! You can now log in using these emails and 'Password123!'")

if __name__ == "__main__":
    seed_database()