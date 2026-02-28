from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import doctor_routes, patient_routes,hospital_routes,auth_routes
load_dotenv()
# This is your main FastAPI Gateway
app = FastAPI(title="Dr. Decide API Gateway")

# 1. Grab the comma-separated string from .env, with a safe fallback
origins_str = os.getenv("FRONTEND_CORS_ORIGINS", "http://localhost:3000")

# 2. Convert it into a clean list for FastAPI
origins_list = [origin.strip() for origin in origins_str.split(",")]

# 3. Pass the dynamic list into the Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Hook up the separate routers
app.include_router(auth_routes.router)
app.include_router(doctor_routes.router)
app.include_router(patient_routes.router)
app.include_router(hospital_routes.router)

@app.get("/")
def health_check():
    return {"status": "Dr. Decide API is running securely!"}

# Run with: uvicorn app.main:app --reload