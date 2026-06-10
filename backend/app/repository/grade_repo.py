from sqlalchemy.orm import Session
from ..models.grade_model import Grade
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..schemas.grade_schema import GradeCreate, GradeUpdate

def _enrich(grade: Grade, db: Session) -> dict:
    d = {c.name: getattr(grade, c.name) for c in grade.__table__.columns}
    student = db.query(Student).filter(Student.student_id == grade.student_id).first()
    subject = db.query(Subject).filter(Subject.subject_id == grade.subject_id).first()
    d["student_name"] = f"{student.last_name}, {student.first_name}" if student else None
    d["student_id"] = student.student_id if student else None
    d["subject_code"] = subject.subject_code if subject else None
    d["subject_name"] = subject.subject_name if subject else None
    d["unit"] = subject.unit if subject else None
    # Frontend-friendly aliases required by GradeOut schema
    d["midterm_grade"] = grade.midterm
    d["final_grade"] = grade.finals
    d["computed_final_grade"] = grade.grade
    return d

def get_all(db: Session):
    grades = db.query(Grade).all()
    return grades

def get_by_student(db: Session, student_id: str):
    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    return grades

def create(db: Session, data: GradeCreate):
    grade = Grade(**data.model_dump())
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade

def update(db: Session, grade_id: int, data: GradeUpdate):
    grade = db.query(Grade).filter(Grade.grade_id == grade_id).first()
    if not grade:
        return None
    # Exclude non-model fields before updating attributes
    if hasattr(data, "model_dump"):
        update_data = data.model_dump(exclude_unset=True, exclude={'subject_code', 'subject_name'})
    else:
        update_data = {k: v for k, v in data.items() if k not in {'subject_code', 'subject_name'}}
    for k, v in update_data.items():
        setattr(grade, k, v)
    db.commit()
    db.refresh(grade)
    return grade

def delete(db: Session, grade_id: int):
    grade = db.query(Grade).filter(Grade.grade_id == grade_id).first()
    if not grade:
        return False
    db.delete(grade)
    db.commit()
    return True
