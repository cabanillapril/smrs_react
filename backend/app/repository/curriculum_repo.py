from sqlalchemy.orm import Session
from ..models.curriculum_model import Curriculum
from ..models.subjects_model import Subject
from ..schemas.curriculum_schema import CurriculumCreate

def _enrich(c: Curriculum, db: Session) -> dict:
    row = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    subject = db.query(Subject).filter(Subject.subject_id == c.subject_id).first()
    row["subject_code"] = subject.subject_code if subject else None
    row["subject_name"] = subject.subject_name if subject else None
    row["unit"]         = subject.unit if subject else None
    return row

def get_by_course(db: Session, course: str, major: str = None):
    query = db.query(Curriculum).filter(Curriculum.course == course)
    if major:
        query = query.filter(Curriculum.major == major)
    entries = query.all()
    return [_enrich(e, db) for e in entries]

def get_all(db: Session):
    return [_enrich(c, db) for c in db.query(Curriculum).all()]

def create(db: Session, data: CurriculumCreate):
    c = Curriculum(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _enrich(c, db)

def delete(db: Session, curriculum_id: int):
    c = db.query(Curriculum).filter(Curriculum.curriculum_id == curriculum_id).first()
    if not c:
        return False
    db.delete(c)
    db.commit()
    return True
