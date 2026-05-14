from pydantic import BaseModel
from typing import Optional

class CurriculumCreate(BaseModel):
    course:     str
    year_level: int
    semester:   int
    subject_id: int
    major:      Optional[str] = None

class CurriculumOut(BaseModel):
    curriculum_id: int
    course:        str
    year_level:    int
    semester:      int
    subject_id:    int
    major:         Optional[str] = None
    subject_code:  Optional[str] = None
    subject_name:  Optional[str] = None
    unit:          Optional[int] = None

    model_config = {"from_attributes": True}
