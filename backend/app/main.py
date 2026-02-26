
from fastapi import FastAPI
from app.routers import doctor_routes, patient_routes,hospital_routes,auth_routes

# This is your main FastAPI Gateway
app = FastAPI(title="Dr. Decide API Gateway")

# Hook up the separate routers
app.include_router(auth_routes.router)
app.include_router(doctor_routes.router)
app.include_router(patient_routes.router)
app.include_router(hospital_routes.router)

@app.get("/")
def health_check():
    return {"status": "Dr. Decide API is running securely!"}

# Run with: uvicorn app.main:app --reload