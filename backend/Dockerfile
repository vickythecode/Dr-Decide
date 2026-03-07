FROM python:3.11-slim

WORKDIR /app

# This will now work because requirements.txt is in the same folder
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything (including the 'app' folder) into the container
COPY . .

# Updated path to point to the app folder
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]