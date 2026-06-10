from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import math
from pydantic import BaseModel
from ..database.db import get_db
from ..repository import grade_repo
from ..schemas.grade_schema import GradeUpdate, GradeOut
from ..models.grade_model import Grade
from ..models.subjects_model import Subject
from ..models.students_model import Student
from .import_routes import sync_deficiency_from_grade, sync_enrollment_from_grade
from .subject_utils import check_subject_conflict

router = APIRouter()


class GradeIn(BaseModel):
    student_id: str
    subject_code: str
    subject_name: Optional[str] = None
    midterm_grade: Optional[float] = None
    final_grade: Optional[float] = None
    semester: Optional[str] = None
    school_year: Optional[str] = None
    instructor: Optional[str] = None
    


def _compute_final(midterm: Optional[float], finals: Optional[float]) -> Optional[float]:
    if midterm is not None and finals is not None:
        avg = (midterm + finals) / 2
        return math.floor(avg * 4 + 0.5) / 4
    if midterm is not None:
        return math.floor(midterm * 4 + 0.5) / 4
    if finals is not None:
        return math.floor(finals * 4 + 0.5) / 4
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
    grades = grade_repo.get_all(db)
    return [_enrich(g, db) for g in grades]


@router.get("/student/{student_id}", response_model=List[GradeOut])
def get_grades_by_student(student_id: str, db: Session = Depends(get_db)):
    grades = grade_repo.get_by_student(db, student_id)
    return [_enrich(g, db) for g in grades]


@router.post("/", response_model=GradeOut, status_code=201)
def create_grade(
    data: GradeIn, 
    overwrite: bool = False, 
    keep_subject: bool = False,
    overwrite_subject: bool = False,
    db: Session = Depends(get_db)
):
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

    # Conflict check
    skip_update, subject = check_subject_conflict(
        db,
        subject_code=code,
        subject_name=data.subject_name,
        keep_subject=keep_subject,
        overwrite_subject=overwrite_subject
    )

    # Find or create subject
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=data.subject_name.strip() if data.subject_name else code,
            unit=3,
        )
        db.add(subject)
    elif not skip_update and data.subject_name and data.subject_name.strip():
        # Update name if allowed
        subject.subject_name = data.subject_name.strip()
    
    db.commit()
    db.refresh(subject)

    # Apply rounding to inputs to ensure they adhere to 0.25 increments
    mid = math.floor(data.midterm_grade * 4 + 0.5) / 4 if data.midterm_grade is not None else None
    fin = math.floor(data.final_grade * 4 + 0.5) / 4 if data.final_grade is not None else None

    final = _compute_final(mid, fin)
    sem_val = int(data.semester) if data.semester else 1

    # Check for existing record to support "Replace" logic
    existing = db.query(Grade).filter(
        Grade.student_id == data.student_id,
        Grade.subject_id == subject.subject_id,
        Grade.semester == sem_val,
        Grade.school_year == data.school_year
    ).first()

    if existing:
        if not overwrite:
            raise HTTPException(
                status_code=409, 
                detail="Grade record already exists for this student, subject, and period. Replace existing record?"
            )
        
        # Update existing record (Replace)
        existing.midterm = mid
        existing.finals = fin
        existing.grade = final if final is not None else 0.0
        existing.remarks = _remarks(final)
        existing.instructor = data.instructor
        db.commit()
        db.refresh(existing)
        entry = existing
    else:
        entry = Grade(
            student_id=data.student_id,
            subject_id=subject.subject_id,
            semester=sem_val,
            school_year=data.school_year,
            midterm=mid,
            finals=fin,
            grade=final if final is not None else 0.0,
            remarks=_remarks(final),
            instructor=data.instructor,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

    sync_deficiency_from_grade(db, entry.student_id, entry.subject_id, entry.semester, entry.remarks, entry.school_year)
    sync_enrollment_from_grade(db, entry.student_id, entry.subject_id, entry.semester, entry.school_year, entry.instructor, float(subject.unit) if subject.unit is not None else 3.0)
    return _enrich(entry, db)


@router.put("/{grade_id}", response_model=GradeOut)
def update_grade(
    grade_id: int, 
    data: GradeUpdate, 
    keep_subject: bool = False,
    overwrite_subject: bool = False,
    db: Session = Depends(get_db)
):
    grade_obj = db.query(Grade).filter(Grade.grade_id == grade_id).first()
    if not grade_obj:
        raise HTTPException(status_code=404, detail="Grade not found")

    # Prepare the update dictionary
    update_dict = data.model_dump(exclude_unset=True)

    # Normalize input field names (handle both 'midterm' and 'midterm_grade')
    raw_mid = update_dict.get("midterm_grade") if update_dict.get("midterm_grade") is not None else update_dict.get("midterm")
    raw_fin = update_dict.get("final_grade") if update_dict.get("final_grade") is not None else update_dict.get("finals")

    # Apply rounding to the identified inputs
    rounded_mid = math.floor(raw_mid * 4 + 0.5) / 4 if raw_mid is not None else grade_obj.midterm
    rounded_fin = math.floor(raw_fin * 4 + 0.5) / 4 if raw_fin is not None else grade_obj.finals

    # Explicitly recalculate the final average and remarks
    computed_grade = _compute_final(rounded_mid, rounded_fin) or 0.0
    computed_remarks = _remarks(computed_grade)

    # Handle Subject Code/Name updates
    target_subject_id = grade_obj.subject_id
    if data.subject_code:
        code = data.subject_code.strip().upper()
        
        # Conflict check
        skip_update, subject = check_subject_conflict(
            db,
            subject_code=code,
            subject_name=data.subject_name,
            keep_subject=keep_subject,
            overwrite_subject=overwrite_subject
        )
        
        if not subject:
            subject = Subject(
                subject_code=code,
                subject_name=data.subject_name.strip() if data.subject_name else code,
                unit=3,
            )
            db.add(subject)
        elif not skip_update and data.subject_name and data.subject_name.strip():
            subject.subject_name = data.subject_name.strip()
        db.commit()
        db.refresh(subject)
        target_subject_id = subject.subject_id

    if data.subject_name and data.subject_name.strip():
        subject = db.query(Subject).filter(Subject.subject_id == target_subject_id).first()
        if subject:
            skip_update, _ = check_subject_conflict(
                db,
                subject_code=subject.subject_code,
                subject_name=data.subject_name,
                keep_subject=keep_subject,
                overwrite_subject=overwrite_subject
            )
            if not skip_update:
                subject.subject_name = data.subject_name.strip()
                db.commit()
    else:
        # Ensure 'subject' is defined for the sync_enrollment_from_grade call
        # if subject_code/name were not updated.
        subject = db.query(Subject).filter(Subject.subject_id == target_subject_id).first()

    grade_obj.subject_id = target_subject_id

    # Build clean update dictionary for the model
    final_update = {
        "midterm": rounded_mid,
        "finals": rounded_fin,
        "grade": computed_grade,
        "remarks": computed_remarks,
    }
    
    if "instructor" in update_dict:
        final_update["instructor"] = update_dict["instructor"]
    if "school_year" in update_dict:
        final_update["school_year"] = update_dict["school_year"]
    if "semester" in update_dict and update_dict["semester"] is not None:
        final_update["semester"] = int(update_dict["semester"])

    # Pass dictionary directly to repository, and use dot notation for attribute access
    updated_grade_obj = grade_repo.update(db, grade_id, final_update)
    
    sync_deficiency_from_grade(db, updated_grade_obj.student_id, updated_grade_obj.subject_id, updated_grade_obj.semester, updated_grade_obj.remarks, updated_grade_obj.school_year)
    sync_enrollment_from_grade(db, updated_grade_obj.student_id, updated_grade_obj.subject_id, updated_grade_obj.semester, updated_grade_obj.school_year, updated_grade_obj.instructor, float(subject.unit) if subject.unit is not None else 3.0)
    return _enrich(updated_grade_obj, db)


@router.delete("/{grade_id}", status_code=204)
def delete_grade(grade_id: int, db: Session = Depends(get_db)):
    ok = grade_repo.delete(db, grade_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Grade not found")