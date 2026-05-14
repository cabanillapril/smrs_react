from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..repository import subject_repo
from ..schemas.subject_schema import SubjectCreate, SubjectUpdate, SubjectOut

router = APIRouter()

@router.get("/", response_model=List[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return subject_repo.get_all(db)

@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    subj = subject_repo.get_by_id(db, subject_id)
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subj

@router.post("/", response_model=SubjectOut, status_code=201)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    existing = subject_repo.get_by_code(db, data.subject_code)
    if existing:
        # Return existing instead of raising an error - idempotent creation
        return existing
    return subject_repo.create(db, data)

@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: int, data: SubjectUpdate, db: Session = Depends(get_db)):
    subj = subject_repo.update(db, subject_id, data)
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subj

@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    ok = subject_repo.delete(db, subject_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Subject not found")
