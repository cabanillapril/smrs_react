from pydantic import BaseModel
from typing import Optional


class DeficiencyCreate(BaseModel):
    student_id: str
    subject_id: str
    type: str
    status: Optional[str] = "pending"
    semester: Optional[str] = None
    deadline: Optional[str] = None
    remarks: Optional[str] = None
    date_recorded: Optional[str] = None


class DeficiencyResolve(BaseModel):
    date_resolved: Optional[str] = None


class DeficiencyOut(BaseModel):
    deficiency_id: int
    student_id: str
    subject_id: int
    type: str
    status: str
    semester: Optional[str]
    deadline: Optional[str]
    remarks: Optional[str]
    date_recorded: Optional[str]
    date_resolved: Optional[str]
    # Joined
    student_name: Optional[str] = None
    student_id: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None

    model_config = {"from_attributes": True}