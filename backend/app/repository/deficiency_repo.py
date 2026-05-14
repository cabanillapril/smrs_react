from sqlalchemy.orm import Session
from ..models.deficiencies_model import Deficiency
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..schemas.deficiency_schema import DeficiencyCreate

def _enrich(d: Deficiency, db: Session) -> dict:
    row = {c.name: getattr(d, c.name) for c in d.__table__.columns}
    student = db.query(Student).filter(Student.student_number == d.student_number).first()
    subject = db.query(Subject).filter(Subject.subject_id == d.subject_id).first()
    row["student_name"] = f"{student.last_name}, {student.first_name}" if student else None
    row["student_id"]   = student.student_id if student else None
    row["subject_code"] = subject.subject_code if subject else None
    row["subject_name"] = subject.subject_name if subject else None
    return row

def get_all(db: Session):
    return [_enrich(d, db) for d in db.query(Deficiency).all()]

def get_by_student(db: Session, student_number: int):
    return [_enrich(d, db) for d in db.query(Deficiency).filter(Deficiency.student_number == student_number).all()]

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

def delete(db: Session, deficiency_id: int):
    defic = db.query(Deficiency).filter(Deficiency.deficiency_id == deficiency_id).first()
    if not defic:
        return False
    db.delete(defic)
    db.commit()
    return True
