from sqlalchemy.orm import Session
from ..models.deficiencies_model import Deficiency
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..schemas.deficiency_schema import DeficiencyCreate, DeficiencyUpdate

def _enrich(d: Deficiency, db: Session) -> dict:
    row = {c.name: getattr(d, c.name) for c in d.__table__.columns}
    # Join using correct columns from SQLAlchemy models
    student = db.query(Student).filter(Student.student_id == d.student_id).first()

    subject = db.query(Subject).filter(Subject.subject_id == d.subject_id).first()
    row["student_name"] = f"{student.last_name}, {student.first_name}" if student else None
    row["student_id"]   = student.student_id if student else None
    row["subject_code"] = subject.subject_code if subject else None
    row["subject_name"] = subject.subject_name if subject else None
    return row

def get_all(db: Session):
    return [_enrich(d, db) for d in db.query(Deficiency).all()]

def get_by_student(db: Session, student_id: str):
    # student_id is stored as string in Student model
    return [_enrich(d, db) for d in db.query(Deficiency).filter(Deficiency.student_id == student_id).all()]

def create(db: Session, data: DeficiencyCreate):
    defic = Deficiency(**data.model_dump())
    db.add(defic)
    db.commit()
    db.refresh(defic)
    return _enrich(defic, db)

def resolve(db: Session, deficiency_id: int, date_resolved: str):
    defic = db.query(Deficiency).filter(Deficiency.deficiency_id == deficiency_id).first()
    if not defic:
        return None
    defic.status = "resolved"
    defic.date_resolved = date_resolved
    db.commit()
    db.refresh(defic)
    return _enrich(defic, db)

def update(db: Session, deficiency_id: int, data: DeficiencyUpdate):
    defic = db.query(Deficiency).filter(Deficiency.deficiency_id == deficiency_id).first()
    if not defic:
        return None
        
    # Handle Subject Code/Name updates if passed
    target_subject_id = defic.subject_id
    if data.subject_code:
        code = data.subject_code.strip().upper()
        subject = db.query(Subject).filter(Subject.subject_code == code).first()
        if not subject:
            subject = Subject(
                subject_code=code,
                subject_name=data.subject_name.strip() if data.subject_name else code,
                unit=3,
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

    defic.subject_id = target_subject_id

    # Exclude non-model fields before updating attributes
    update_data = data.model_dump(exclude_unset=True, exclude={'subject_code', 'subject_name'})
    for k, v in update_data.items():
        setattr(defic, k, v)
        
    db.commit()
    db.refresh(defic)
    return _enrich(defic, db)


def delete(db: Session, deficiency_id: int):
    defic = db.query(Deficiency).filter(Deficiency.deficiency_id == deficiency_id).first()
    if not defic:
        return False
    db.delete(defic)
    db.commit()
    return True
