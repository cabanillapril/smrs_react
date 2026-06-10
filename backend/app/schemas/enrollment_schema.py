from pydantic import BaseModel
from typing import Optional

class EnrollmentCreate(BaseModel):
    student_id: str
    subject_code: str
    subject_name: Optional[str] = None
    semester: Optional[int] = 1
    school_year: Optional[str] = None
    instructor: Optional[str] = None
    units: Optional[float] = 3.0
    schedule: Optional[str] = None

class EnrollmentUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    semester: Optional[int] = None
    school_year: Optional[str] = None
    instructor: Optional[str] = None
    units: Optional[float] = None
    schedule: Optional[str] = None

class EnrollmentOut(BaseModel):
    enrollment_id: int
    student_id: Optional[str] = None
    subject_id: int
    semester: Optional[int] = None
    school_year: Optional[str] = None
    instructor: Optional[str] = None
    schedule: Optional[str] = None
    units: Optional[float] = None
    date_enrolled: Optional[str] = None
    
    # Joined fields
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None

    model_config = {"from_attributes": True}
