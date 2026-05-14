from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database.db import get_db
from ..repository import grade_repo
from ..schemas.grade_schema import GradeUpdate, GradeOut
from ..models.grade_model import Grade
from ..models.subjects_model import Subject
from ..models.students_model import Student

router = APIRouter()


class GradeIn(BaseModel):
    student_id: str
    subject_code: str
    midterm_grade: Optional[float] = None
    final_grade: Optional[float] = None
    semester: Optional[str] = None
    school_year: Optional[str] = None


def _compute_final(midterm: Optional[float], finals: Optional[float]) -> Optional[float]:
    if midterm is not None and finals is not None:
        return round((midterm + finals) / 2, 2)
    if midterm is not None:
        return midterm
    if finals is not None:
        return finals
    return None


def _remarks(grade: Optional[float]) -> str:
    if grade is None:
        return "INC"
    return "Passed" if grade <= 3.0 else "Failed"


def _enrich(g: Grade, db: Session) -> dict:
    row = {c.name: getattr(g, c.name) for c in g.__table__.columns}
    student = db.query(Student).filter(Student.student_id == g.student_id).first()
    subject = db.query(Subject).filter(Subject.subject_id == g.subject_id).first()
    row["student_name"] = f"{student.last_name}, {student.first_name}" if student else None
    row["student_id"] = student.student_id if student else None
    row["subject_code"] = subject.subject_code if subject else None
    row["subject_name"] = subject.subject_name if subject else None
    row["unit"] = subject.unit if subject else None
    # Frontend-friendly aliases
    row["midterm_grade"] = g.midterm
    row["final_grade"] = g.finals
    row["computed_final_grade"] = g.grade
    return row


@router.get("/", response_model=List[GradeOut])
def list_grades(db: Session = Depends(get_db)):
    return grade_repo.get_all(db)


@router.get("/student/{student_id}", response_model=List[GradeOut])
def get_grades_by_student(student_id: str, db: Session = Depends(get_db)):
    return grade_repo.get_by_student(db, student_id)


@router.post("/", response_model=GradeOut, status_code=201)
def create_grade(data: GradeIn, db: Session = Depends(get_db)):
    code = data.subject_code.strip().upper()

    # Find or create subject
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=code,
            unit=3,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)

    final = _compute_final(data.midterm_grade, data.final_grade)

    entry = Grade(
        student_id=data.student_id,
        subject_id=subject.subject_id,
        semester=1,
        school_year=data.school_year,
        midterm=data.midterm_grade,
        finals=data.final_grade,
        grade=final if final is not None else 0.0,
        remarks=_remarks(final),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _enrich(entry, db)


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