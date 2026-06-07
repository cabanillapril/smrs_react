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
    code = data.subject_code.strip().upper()
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    if not subject:
        subject = Subject(
            subject_code=code,
            subject_name=code,
            unit=int(data.units) if data.units else 3
        )
        db.add(subject)
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
    for k, v in data.model_dump(exclude_unset=True).items():
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
