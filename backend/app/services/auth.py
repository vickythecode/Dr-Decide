import urllib.request
import os
import json
import boto3
from botocore.exceptions import ClientError
from jose import jwk, jwt
from jose.utils import base64url_decode
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

# 1. Load environment variables
load_dotenv()

# 2. Grab your Cognito details
REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

# 3. Initialize Boto3 Cognito Client (For Login/Signup)
cognito_client = boto3.client('cognito-idp', region_name=REGION)


# --- PART 1: LOGIN & SIGNUP FUNCTIONS ---

def sign_up_user(email, password, role):
    try:
        response = cognito_client.sign_up(
            ClientId=APP_CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'custom:role', 'Value': role}
            ]
        )
        return response
    except ClientError as e:
        return {"error": e.response['Error']['Message']}

def login_user(email, password):
    try:
        response = cognito_client.initiate_auth(
            ClientId=APP_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': email,
                'PASSWORD': password
            }
        )
        return response['AuthenticationResult']
    except ClientError as e:
        return {"error": e.response['Error']['Message']}

def require_role(required_role: str):
    """
    A dependency that checks if the logged-in user has the correct role.
    """
    def role_checker(claims: dict = Depends(verify_cognito_token)):
        # Extract the custom role from the token claims
        user_role = claims.get('custom:role')
        
        if user_role != required_role:
            raise HTTPException(
                status_code=403, 
                detail=f"Access Denied. This action requires the '{required_role}' role. Your role: {user_role}"
            )
        return claims
        
    return role_checker
# --- PART 2: TOKEN VERIFICATION (SECURITY) ---

keys = []
if not USER_POOL_ID or not APP_CLIENT_ID:
    print("CRITICAL WARNING: COGNITO_USER_POOL_ID or COGNITO_APP_CLIENT_ID is missing from your .env file!")
else:
    # Build the URL where Cognito stores your public keys
    KEYS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
    
    try:
        # Fetch the keys once when the server starts
        with urllib.request.urlopen(KEYS_URL) as response:
            keys = json.loads(response.read().decode('utf-8'))['keys']
        print("SUCCESS: Cognito security keys loaded properly.")
    except Exception as e:
        print(f"CRITICAL ERROR FETCHING COGNITO KEYS: {e}")

security_scheme = HTTPBearer()

def verify_cognito_token(credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """
    Validates the JWT token provided in the Authorization header.
    """
    if not keys:
        raise HTTPException(status_code=500, detail="Cognito keys were not loaded properly on server startup.")

    token = credentials.credentials
    
    try:
        # Get the key ID from the token header
        headers = jwt.get_unverified_headers(token)
        kid = headers['kid']

        # Find the matching public key from Cognito
        key_index = -1
        for i in range(len(keys)):
            if kid == keys[i]['kid']:
                key_index = i
                break
        
        if key_index == -1:
            raise HTTPException(status_code=401, detail="Public key not found in JWKS")

        # Construct the public key
        public_key = jwk.construct(keys[key_index])

        # Get the message and signature from the token
        message, encoded_signature = str(token).rsplit('.', 1)
        decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))

        # Verify the signature
        if not public_key.verify(message.encode("utf8"), decoded_signature):
            raise HTTPException(status_code=401, detail="Signature verification failed")

        # Verify the claims (expiration, audience, etc.)
        claims = jwt.get_unverified_claims(token)
        
        if claims['client_id'] != APP_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token was not issued for this audience")

        return claims # Token is valid! Returns the user's data

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication credentials: {str(e)}")