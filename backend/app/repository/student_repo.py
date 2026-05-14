from sqlalchemy.orm import Session
from ..models.students_model import Student
from ..schemas.student_schema import StudentCreate, StudentUpdate

def get_all(db: Session):
    return db.query(Student).all()

def get_by_id(db: Session, student_number: int):
    return db.query(Student).filter(Student.student_number == student_number).first()

def create(db: Session, data: StudentCreate):
    student = Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

def update(db: Session, student_number: int, data: StudentUpdate):
    student = get_by_id(db, student_number)
    if not student:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student

def delete(db: Session, student_number: int):
    student = get_by_id(db, student_number)
    if not student:
        return False
    db.delete(student)
    db.commit()
    return True
