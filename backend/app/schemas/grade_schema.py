from pydantic import BaseModel
from typing import Optional


class GradeCreate(BaseModel):
    student_id: str
    subject_id: Optional[int] = None
    semester: Optional[int] = 1
    school_year: Optional[str] = None
    midterm: Optional[float] = None
    finals: Optional[float] = None
    grade: float
    remarks: Optional[str] = None


class GradeUpdate(BaseModel):
    midterm: Optional[float] = None
    finals: Optional[float] = None
    grade: Optional[float] = None
    remarks: Optional[str] = None


class GradeOut(BaseModel):
    grade_id: int
    student_id: str
    subject_id: int
    semester: Optional[int]
    school_year: Optional[str]
    midterm: Optional[float]
    finals: Optional[float]
    grade: float
    remarks: Optional[str]
    # Joined fields
    student_name: Optional[str] = None
    student_id: Optional[str] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    unit: Optional[int] = None
    # Frontend-friendly aliases
    midterm_grade: Optional[float] = None
    final_grade: Optional[float] = None
    computed_final_grade: Optional[float] = None

    model_config = {"from_attributes": True}