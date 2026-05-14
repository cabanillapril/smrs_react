from pydantic import BaseModel, EmailStr
from typing import Optional

class StudentCreate(BaseModel):
    student_id:     Optional[str] = None
    first_name:     str
    middle_name:    Optional[str] = None
    last_name:      str
    birthday:       Optional[str] = None
    gender:         Optional[str] = None
    address:        Optional[str] = None
    contact_number: Optional[str] = None
    email:          Optional[str] = None
    year_level:     Optional[int] = 1
    course:         Optional[str] = None
    section:        Optional[str] = None
    status:         Optional[str] = "Regular"
    major:          Optional[str] = None

class StudentUpdate(BaseModel):
    student_id:     Optional[str] = None
    first_name:     Optional[str] = None
    middle_name:    Optional[str] = None
    last_name:      Optional[str] = None
    birthday:       Optional[str] = None
    gender:         Optional[str] = None
    address:        Optional[str] = None
    contact_number: Optional[str] = None
    email:          Optional[str] = None
    year_level:     Optional[int] = None
    course:         Optional[str] = None
    section:        Optional[str] = None
    status:         Optional[str] = None
    major:          Optional[str] = None

class StudentOut(BaseModel):
    student_number: int
    student_id:     Optional[str]
    first_name:     str
    middle_name:    Optional[str]
    last_name:      str
    birthday:       Optional[str]
    gender:         Optional[str]
    address:        Optional[str]
    contact_number: Optional[str]
    email:          Optional[str]
    year_level:     Optional[int]
    course:         Optional[str]
    section:        Optional[str]
    status:         Optional[str]
    major:          Optional[str]

    model_config = {"from_attributes": True}
