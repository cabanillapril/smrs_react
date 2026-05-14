from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..repository import student_repo
from ..schemas.student_schema import StudentCreate, StudentUpdate, StudentOut

router = APIRouter()

@router.get("/getall", response_model=List[StudentOut])
def list_students(db: Session = Depends(get_db)):
    return student_repo.get_all(db)

@router.get("/{student_number}", response_model=StudentOut)
def get_student(student_number: int, db: Session = Depends(get_db)):
    student = student_repo.get_by_id(db, student_number)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/", response_model=StudentOut, status_code=201)
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    return student_repo.create(db, data)

@router.put("/{student_number}", response_model=StudentOut)
def update_student(student_number: int, data: StudentUpdate, db: Session = Depends(get_db)):
    student = student_repo.update(db, student_number, data)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.delete("/{student_number}", status_code=204)
def delete_student(student_number: int, db: Session = Depends(get_db)):
    ok = student_repo.delete(db, student_number)
    if not ok:
        raise HTTPException(status_code=404, detail="Student not found")
