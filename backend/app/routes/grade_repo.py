from sqlalchemy.orm import Session
from ..models.grade_model import Grade
from ..schemas.grade_schema import GradeCreate, GradeUpdate # Assuming these schemas exist

def get_all(db: Session):
    return db.query(Grade).all()

def get_by_student(db: Session, student_id: str):
    return db.query(Grade).filter(Grade.student_id == student_id).all()

def create(db: Session, grade: GradeCreate):
    db_grade = Grade(**grade.model_dump())
    db.add(db_grade)
    db.commit()
    db.refresh(db_grade)
    return db_grade

def update(db: Session, grade_id: int, grade_data: dict):
    db_grade = db.query(Grade).filter(Grade.grade_id == grade_id).first()
    if db_grade:
        for key, value in grade_data.items():
            # Exclude fields that are not directly part of the Grade model or are handled separately
            if key in ["subject_code", "subject_name", "student_id", "student_name", "unit", "computed_final_grade"]:
                continue
            if hasattr(db_grade, key):
                setattr(db_grade, key, value)
        db.commit()
        db.refresh(db_grade)
    return db_grade

def delete(db: Session, grade_id: int):
    db_grade = db.query(Grade).filter(Grade.grade_id == grade_id).first()
    if db_grade:
        db.delete(db_grade)
        db.commit()
        return True
    return False