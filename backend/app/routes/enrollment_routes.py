from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..repository import enrollment_repo
from ..schemas.enrollment_schema import EnrollmentCreate, EnrollmentUpdate, EnrollmentOut

router = APIRouter()

@router.get("/student/{student_id}", response_model=List[EnrollmentOut])
def get_enrollments_by_student(student_id: str, db: Session = Depends(get_db)):
    return enrollment_repo.get_by_student(db, student_id)

@router.post("/", response_model=EnrollmentOut, status_code=201)
def create_enrollment(data: EnrollmentCreate, db: Session = Depends(get_db)):
    return enrollment_repo.create(db, data)

@router.put("/{enrollment_id}", response_model=EnrollmentOut)
def update_enrollment(enrollment_id: int, data: EnrollmentUpdate, db: Session = Depends(get_db)):
    enroll = enrollment_repo.update(db, enrollment_id, data)
    if not enroll:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enroll

@router.delete("/{enrollment_id}", status_code=204)
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    ok = enrollment_repo.delete(db, enrollment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Enrollment not found")
