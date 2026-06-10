from sqlalchemy.orm import Session
from datetime import date
from ..models.enrollment_model import Enrollment
from ..models.subjects_model import Subject
from ..schemas.enrollment_schema import EnrollmentCreate, EnrollmentUpdate

def _enrich(enrollment: Enrollment, db: Session) -> dict:
    d = {c.name: getattr(enrollment, c.name) for c in enrollment.__table__.columns}
    subject = db.query(Subject).filter(Subject.subject_id == enrollment.subject_id).first()
    d["subject_code"] = subject.subject_code if subject else None
    d["subject_name"] = subject.subject_name if subject else None
    return d

def get_by_student(db: Session, student_id: str):
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    return [_enrich(e, db) for e in enrollments]

def create(db: Session, data: EnrollmentCreate):
    # Verify student exists
    student_obj = db.query(Student).filter(
        (Student.student_id == data.student_id) | (Student.student_number == data.student_id)
    ).first()
    if not student_obj:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=404, 
            detail=f"Student ID '{data.student_id}' does not exist in the database. Please register the student first."
        )
    # Use normalized student_id
    data.student_id = student_obj.student_id

    code = data.subject_code.strip().upper()
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=data.subject_name.strip() if data.subject_name else code,
            unit=int(data.units) if data.units else 3
        )
        db.add(subject)
        db.commit()
        db.refresh(subject)
    elif data.subject_name and data.subject_name.strip():
        subject.subject_name = data.subject_name.strip()
        db.commit()
        db.refresh(subject)
        
    enroll = Enrollment(
        student_id=data.student_id,
        subject_id=subject.subject_id,
        semester=data.semester,
        school_year=data.school_year,
        instructor=data.instructor,
        units=data.units,
        schedule=data.schedule,
        date_enrolled=date.today().isoformat()
    )
    db.add(enroll)
    db.commit()
    db.refresh(enroll)
    return _enrich(enroll, db)

def update(db: Session, enrollment_id: int, data: EnrollmentUpdate):
    enroll = db.query(Enrollment).filter(Enrollment.enrollment_id == enrollment_id).first()
    if not enroll:
        return None

    # Handle Subject Code/Name updates
    target_subject_id = enroll.subject_id
    if data.subject_code:
        code = data.subject_code.strip().upper()
        subject = db.query(Subject).filter(Subject.subject_code == code).first()
        if not subject:
            subject = Subject(
                subject_code=code,
                subject_name=data.subject_name.strip() if data.subject_name else code,
                unit=int(data.units) if data.units else 3,
            )
            db.add(subject)
        db.commit()
        db.refresh(subject)
        target_subject_id = subject.subject_id

    if data.subject_name and data.subject_name.strip():
        subject = db.query(Subject).filter(Subject.subject_id == target_subject_id).first()
        if subject:
            subject.subject_name = data.subject_name.strip()
            db.commit()

    enroll.subject_id = target_subject_id

    # Exclude non-model fields before updating attributes
    update_data = data.model_dump(exclude_unset=True, exclude={'subject_code', 'subject_name'})
    for k, v in update_data.items():
        setattr(enroll, k, v)

    db.commit()
    db.refresh(enroll)
    return _enrich(enroll, db)

def delete(db: Session, enrollment_id: int):
    enroll = db.query(Enrollment).filter(Enrollment.enrollment_id == enrollment_id).first()
    if not enroll:
        return False
    db.delete(enroll)
    db.commit()
    return True
