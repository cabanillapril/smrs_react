from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database.db import get_db
from ..repository import deficiency_repo
from ..schemas.deficiency_schema import DeficiencyCreate, DeficiencyResolve, DeficiencyOut

router = APIRouter()

@router.get("/", response_model=List[DeficiencyOut])
def list_deficiencies(db: Session = Depends(get_db)):
    return deficiency_repo.get_all(db)

@router.get("/student/{student_number}", response_model=List[DeficiencyOut])
def get_deficiencies_by_student(student_number: int, db: Session = Depends(get_db)):
    return deficiency_repo.get_by_student(db, student_number)

@router.post("/", response_model=DeficiencyOut, status_code=201)
def create_deficiency(data: DeficiencyCreate, db: Session = Depends(get_db)):
    return deficiency_repo.create(db, data)

@router.patch("/{deficiency_id}/resolve", response_model=DeficiencyOut)
def resolve_deficiency(deficiency_id: int, data: DeficiencyResolve, db: Session = Depends(get_db)):
    from datetime import date
    date_resolved = data.date_resolved or str(date.today())
    result = deficiency_repo.resolve(db, deficiency_id, date_resolved)
    if not result:
        raise HTTPException(status_code=404, detail="Deficiency not found")
    return result

@router.delete("/{deficiency_id}", status_code=204)
def delete_deficiency(deficiency_id: int, db: Session = Depends(get_db)):
    ok = deficiency_repo.delete(db, deficiency_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Deficiency not found")
