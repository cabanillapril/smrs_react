from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..repository import grade_repo
from ..schemas.grade_schema import GradeCreate, GradeUpdate, GradeOut

router = APIRouter()

@router.get("/", response_model=List[GradeOut])
def list_grades(db: Session = Depends(get_db)):
    return grade_repo.get_all(db)

@router.get("/student/{student_number}", response_model=List[GradeOut])
def get_grades_by_student(student_number: int, db: Session = Depends(get_db)):
    return grade_repo.get_by_student(db, student_number)

@router.post("/", response_model=GradeOut, status_code=201)
def create_grade(data: GradeCreate, db: Session = Depends(get_db)):
    return grade_repo.create(db, data)

@router.put("/{grade_id}", response_model=GradeOut)
def update_grade(grade_id: int, data: GradeUpdate, db: Session = Depends(get_db)):
    grade = grade_repo.update(db, grade_id, data)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    return grade

@router.delete("/{grade_id}", status_code=204)
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    ok = grade_repo.delete(db, grade_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Grade not found")
