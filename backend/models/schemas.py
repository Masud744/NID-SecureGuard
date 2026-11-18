from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    nid_number: str = Field(..., min_length=10, max_length=17)
    full_name: str = Field(..., min_length=1, max_length=200)
    date_of_birth: str
    address: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    nid_number: str
    full_name: str
    status: str
    created_at: datetime


class VerifyRequest(BaseModel):
    nid_number: str = Field(..., min_length=10, max_length=17)


class VerifyResponse(BaseModel):
    access_decision: str
    nid_number: str
    face_result: dict
    fingerprint_result: dict
    failure_reason: Optional[str] = None
    timestamp: datetime


class EnrollmentStatus(BaseModel):
    user_id: str
    face_enrolled: bool
    fingerprint_enrolled: bool
    fully_registered: bool


class FaceEnrollRequest(BaseModel):
    sample_count: int = Field(default=20, ge=1, le=100)


class FingerprintEnrollRequest(BaseModel):
    template_id: int = Field(..., ge=1, le=200)
