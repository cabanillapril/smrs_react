from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database.db import get_db
from ..repository import deficiency_repo
from ..schemas.deficiency_schema import DeficiencyResolve, DeficiencyOut, DeficiencyUpdate
from ..models.deficiencies_model import Deficiency
from ..models.subjects_model import Subject
from ..models.students_model import Student

router = APIRouter()


class DeficiencyIn(BaseModel):
    student_id: str
    subject_code: str
    subject_name: Optional[str] = None
    type: str
    status: Optional[str] = "pending"
    semester: Optional[str] = None
    deadline: Optional[str] = None
    remarks: Optional[str] = None
    date_recorded: Optional[str] = None


def _enrich(d: Deficiency, db: Session) -> dict:
    row = {c.name: getattr(d, c.name) for c in d.__table__.columns}
    student = db.query(Student).filter(Student.student_id == d.student_id).first()
    subject = db.query(Subject).filter(Subject.subject_id == d.subject_id).first()
    row["student_name"] = f"{student.last_name}, {student.first_name}" if student else None
    row["student_id"] = student.student_id if student else None
    row["subject_code"] = subject.subject_code if subject else None
    row["subject_name"] = subject.subject_name if subject else None
    return row


@router.get("/", response_model=List[DeficiencyOut])
def list_deficiencies(db: Session = Depends(get_db)):
    return deficiency_repo.get_all(db)


@router.get("/student/{student_id}", response_model=List[DeficiencyOut])
def get_deficiencies_by_student(student_id: str, db: Session = Depends(get_db)):
    return deficiency_repo.get_by_student(db, student_id)

    


@router.post("/", response_model=DeficiencyOut, status_code=201)
def create_deficiency(data: DeficiencyIn, db: Session = Depends(get_db)):
    # Verify student exists
    student_obj = db.query(Student).filter(
        (Student.student_id == data.student_id) | (Student.student_number == data.student_id)
    ).first()
    if not student_obj:
        raise HTTPException(
            status_code=404, 
            detail=f"Student ID '{data.student_id}' does not exist in the database. Please register the student first."
        )
    # Use normalized student_id
    data.student_id = student_obj.student_id

    code = data.subject_code.strip().upper()

    # Find or create subject
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=data.subject_name.strip() if data.subject_name else code,
            unit=3,
        )
        db.add(subject)
    elif data.subject_name and data.subject_name.strip():
        subject.subject_name = data.subject_name.strip()

    db.commit()
    db.refresh(subject)

    entry = Deficiency(
        student_id=data.student_id,
        subject_id=subject.subject_id,
        type=data.type,
        status=data.status or "pending",
        semester=data.semester,
        deadline=data.deadline,
        remarks=data.remarks,
        date_recorded=data.date_recorded,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _enrich(entry, db)


@router.patch("/{deficiency_id}/resolve", response_model=DeficiencyOut)
def resolve_deficiency(deficiency_id: int, data: DeficiencyResolve, db: Session = Depends(get_db)):
    from datetime import date
    date_resolved = data.date_resolved or str(date.today())
    result = deficiency_repo.resolve(db, deficiency_id, date_resolved)
    if not result:
        raise HTTPException(status_code=404, detail="Deficiency not found")
    return result


@router.put("/{deficiency_id}", response_model=DeficiencyOut)
def update_deficiency(deficiency_id: int, data: DeficiencyUpdate, db: Session = Depends(get_db)):
    result = deficiency_repo.update(db, deficiency_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Deficiency not found")
    return result


@router.delete("/{deficiency_id}", status_code=204)
def delete_deficiency(deficiency_id: int, db: Session = Depends(get_db)):
    ok = deficiency_repo.delete(db, deficiency_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Deficiency not found")