from sqlalchemy.orm import Session
from ..models.subjects_model import Subject
from ..schemas.subject_schema import SubjectCreate, SubjectUpdate

def get_all(db: Session):
    return db.query(Subject).all()

def get_by_id(db: Session, subject_id: int):
    return db.query(Subject).filter(Subject.subject_id == subject_id).first()

def get_by_code(db: Session, subject_code: str):
    return db.query(Subject).filter(Subject.subject_code == subject_code).first()

def create(db: Session, data: SubjectCreate):
    subj = Subject(**data.model_dump())
    db.add(subj)
    db.commit()
    db.refresh(subj)
    return subj

def update(db: Session, subject_id: int, data: SubjectUpdate):
    subj = get_by_id(db, subject_id)
    if not subj:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(subj, k, v)
    db.commit()
    db.refresh(subj)
    return subj

def delete(db: Session, subject_id: int):
    subj = get_by_id(db, subject_id)
    if not subj:
        return False
    db.delete(subj)
    db.commit()
    return True
