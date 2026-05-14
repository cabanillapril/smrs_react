from pydantic import BaseModel
from typing import Optional

class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    unit:         Optional[int] = 3
    course:       Optional[str] = None
    major:        Optional[str] = None

class SubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    unit:         Optional[int] = None
    course:       Optional[str] = None
    major:        Optional[str] = None

class SubjectOut(BaseModel):
    subject_id:   int
    subject_code: str
    subject_name: str
    unit:         Optional[int]
    course:       Optional[str]
    major:        Optional[str]

    model_config = {"from_attributes": True}
