from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database.db import get_db
from ..repository import curriculum_repo
from ..schemas.curriculum_schema import CurriculumCreate, CurriculumOut

router = APIRouter()

@router.get("/", response_model=List[CurriculumOut])
def get_curriculum(course: Optional[str] = None, major: Optional[str] = None, db: Session = Depends(get_db)):
    if course:
        return curriculum_repo.get_by_course(db, course, major)
    return curriculum_repo.get_all(db)

@router.post("/", response_model=CurriculumOut, status_code=201)
def add_to_curriculum(data: CurriculumCreate, db: Session = Depends(get_db)):
    return curriculum_repo.create(db, data)

@router.delete("/{curriculum_id}", status_code=204)
def remove_from_curriculum(curriculum_id: int, db: Session = Depends(get_db)):
    ok = curriculum_repo.delete(db, curriculum_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Curriculum entry not found")
