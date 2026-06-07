from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from typing import List
from ..database.db import get_db
from ..repository import student_repo
from ..schemas.student_schema import StudentCreate, StudentUpdate, StudentOut
from ..models.students_model import Student
from ..models.grade_model import Grade
from ..models.deficiencies_model import Deficiency
from ..models.enrollment_model import Enrollment
from ..models.subjects_model import Subject

router = APIRouter()

@router.get("/getall", response_model=List[StudentOut])
def list_students(db: Session = Depends(get_db)):
    return student_repo.get_all(db)

@router.post("/promote")
def promote_students(db: Session = Depends(get_db)):
    """Bulk promotes students based on course duration."""
    students = db.query(Student).filter(Student.status != 'Graduated').all()
    count = 0
    grad_count = 0
    for s in students:
        course_name = (s.course or "").upper()
        if "ONE-YEAR" in course_name:
            max_years = 1
        elif "TWO-YEAR" in course_name or "ASSOCIATE" in course_name or "AMAT" in course_name:
            max_years = 2
        else:
            max_years = 4
            
        if (s.year_level or 1) < max_years:
            s.year_level = (s.year_level or 1) + 1
            count += 1
        else:
            s.status = 'Graduated'
            grad_count += 1
            
    db.commit()
    return {"message": f"Promotion complete: {count} promoted, {grad_count} graduated.", "count": count}

@router.post("/{student_number}/individual-promote")
def promote_individual_student(student_number: int, db: Session = Depends(get_db)):
    """Promotes a single student to the next year level or marks as Graduated."""
    student = student_repo.get_by_id(db, student_number)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.status == 'Graduated':
        return {"message": "Student has already graduated", "status": "Graduated"}

    course_name = (student.course or "").upper()
    if "ONE-YEAR" in course_name:
        max_years = 1
    elif "TWO-YEAR" in course_name or "ASSOCIATE" in course_name or "AMAT" in course_name:
        max_years = 2
    else:
        max_years = 4
        
    current_yr = student.year_level or 1
    if current_yr < max_years:
        student.year_level = current_yr + 1
        msg = f"Promoted to Year {student.year_level}"
    else:
        student.status = 'Graduated'
        msg = "Student has graduated"
        
    db.commit()
    db.refresh(student)
    return {"message": msg, "year_level": student.year_level, "status": student.status}

@router.get("/{student_id}/gwa")
def get_student_gwa(student_id: str, db: Session = Depends(get_db)):
    grades = db.query(Grade).filter(Grade.student_id == student_id).all()
    total_weighted_grade = 0.0
    total_units = 0.0
    
    for g in grades:
        if g.remarks in ["Passed", "Failed"] and g.grade is not None:
            subject = db.query(Subject).filter(Subject.subject_id == g.subject_id).first()
            if subject and subject.unit:
                unit = float(subject.unit)
                # Ensure grade is actually numeric before computing
                if g.grade > 0:
                    total_weighted_grade += float(g.grade) * unit
                    total_units += unit
                
    if total_units == 0:
        return {"gwa": None, "total_units": 0}
        
    gwa = total_weighted_grade / total_units
    return {"gwa": round(gwa, 4), "total_units": total_units}

@router.get("/{student_number}", response_model=StudentOut)
def get_student(student_number: int, db: Session = Depends(get_db)):
    student = student_repo.get_by_id(db, student_number)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.get("/by-student-id/{student_id_str}", response_model=StudentOut)
def get_student_by_string_id(student_id_str: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id_str).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/", response_model=StudentOut, status_code=201)
def create_student(data: StudentCreate, db: Session = Depends(get_db)):
    return student_repo.create(db, data)

@router.put("/{student_number}", response_model=StudentOut)
def update_student(student_number: int, data: StudentUpdate, db: Session = Depends(get_db)):
    db_student = student_repo.get_by_id(db, student_number)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    old_id = db_student.student_id
    new_id = data.student_id

    if old_id != new_id:
        # Temporarily disable foreign keys to perform the update.
        # This is necessary because SQLite lacks DEFERRABLE constraints and 
        # often lacks CASCADE rules in older schema files.
        db.commit()
        db.execute(text("PRAGMA foreign_keys = OFF"))
        try:
            target_old = (old_id or "").strip()
            for model in [Grade, Deficiency, Enrollment]:
                db.query(model).filter(
                    or_(model.student_id == old_id, text("trim(student_id) = :oid"))
                ).params(oid=target_old).update({model.student_id: new_id}, synchronize_session=False)
            
            student = student_repo.update(db, student_number, data)
            db.commit()
        finally:
            db.execute(text("PRAGMA foreign_keys = ON"))
        return student
    
    student = student_repo.update(db, student_number, data)
    return student

@router.delete("/{student_number}", status_code=204)
def delete_student(student_number: int, db: Session = Depends(get_db)):
    student = student_repo.get_by_id(db, student_number)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # We perform manual cleanup of related records. 
    # This is a safety measure in case the physical SQLite database was created
    # without ON DELETE CASCADE constraints. It prevents the IntegrityError
    # and ensures no orphaned "Unknown Student" records are left behind.
    if student.student_id:
        db.query(Grade).filter(Grade.student_id == student.student_id).delete()
        db.query(Deficiency).filter(Deficiency.student_id == student.student_id).delete()
        db.query(Enrollment).filter(Enrollment.student_id == student.student_id).delete()
    
    db.delete(student)
    db.commit()
    return None
