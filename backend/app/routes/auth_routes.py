from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    username: str

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    # Simple hardcoded credentials for demonstration
    if data.username == "admin" and data.password == "admin123":
        return {
            "access_token": "mock-token-123",
            "username": "admin"
        }
    raise HTTPException(status_code=401, detail="Invalid username or password")
