from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated
from pydantic import BaseModel
from ..database.db import get_db
from ..repository import curriculum_repo, subject_repo
from ..schemas.curriculum_schema import CurriculumOut
from ..models.curriculum_model import Curriculum
from ..models.subjects_model import Subject
from .subject_utils import check_subject_conflict

router = APIRouter()


class CurriculumIn(BaseModel):
    course: str
    major: Optional[str] = None
    year_level: int
    semester: int
    subject_code: str
    subject_name: Optional[str] = None
    units: Optional[int] = 3


@router.get("/", response_model=List[CurriculumOut])
def get_curriculum(
    course: Optional[str] = None,
    major: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if course:
        return curriculum_repo.get_by_course(db, course, major)
    return curriculum_repo.get_all(db)


@router.post("/", response_model=CurriculumOut, status_code=201)
def add_to_curriculum(
    data: CurriculumIn, 
    keep_subject: bool = False,
    overwrite_subject: bool = False,
    db: Session = Depends(get_db)
):
    code = data.subject_code.strip().upper()

    # Conflict check
    skip_update, subject = check_subject_conflict(
        db,
        subject_code=code,
        subject_name=data.subject_name,
        units=data.units,
        keep_subject=keep_subject,
        overwrite_subject=overwrite_subject
    )

    # Find or create subject
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=data.subject_name.strip() if data.subject_name else code,
            unit=data.units or 3,
            course=data.course,
            major=data.major,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
    elif not skip_update:
        if data.subject_name is not None:
            subject.subject_name = data.subject_name.strip()
        if data.units is not None:
            subject.unit = data.units
        subject.course = data.course
        subject.major = data.major
        db.commit()
        db.refresh(subject)

    # Create curriculum row
    entry = Curriculum(
        course=data.course,
        major=data.major,
        year_level=data.year_level,
        semester=data.semester,
        subject_id=subject.subject_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return curriculum_repo._enrich(entry, db)


@router.put("/{curriculum_id}", response_model=CurriculumOut)
def update_curriculum(
    curriculum_id: int,
    data: CurriculumIn,
    keep_subject: bool = False,
    overwrite_subject: bool = False,
    db: Session = Depends(get_db),
):
    # Load entry
    entry = db.query(Curriculum).filter(Curriculum.curriculum_id == curriculum_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Curriculum entry not found")

    code = data.subject_code.strip().upper()

    # Conflict check
    skip_update, subject = check_subject_conflict(
        db,
        subject_code=code,
        subject_name=data.subject_name,
        units=data.units,
        keep_subject=keep_subject,
        overwrite_subject=overwrite_subject
    )

    # Find or create/update subject
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=data.subject_name.strip() if data.subject_name else code,
            unit=data.units or 3,
            course=data.course,
            major=data.major,
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
    elif not skip_update:
        # Update subject details 
        if data.subject_name is not None:
            subject.subject_name = data.subject_name.strip()
        if data.units is not None:
            subject.unit = data.units
        subject.course = data.course
        subject.major = data.major
        db.add(subject)
        db.commit()
        db.refresh(subject)

    # Update curriculum row
    entry.course = data.course
    entry.major = data.major
    entry.year_level = data.year_level
    entry.semester = data.semester
    entry.subject_id = subject.subject_id

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return curriculum_repo._enrich(entry, db)


@router.delete("/{curriculum_id}", status_code=204)
def remove_from_curriculum(curriculum_id: int, db: Session = Depends(get_db)):
    ok = curriculum_repo.delete(db, curriculum_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Curriculum entry not found")

