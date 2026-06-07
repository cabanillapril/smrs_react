from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import io
from ..database.db import get_db
from ..models.students_model import Student
from ..models.grade_model import Grade
from ..models.deficiencies_model import Deficiency
from ..models.enrollment_model import Enrollment
from ..models.subjects_model import Subject

router = APIRouter()

@router.get("/grade", status_code=200)
@router.get("/grades", status_code=200)
def export_grade_report(db: Session = Depends(get_db)):
    """Generates a CSV report of all grade records in the system."""
    results = db.query(
        Grade.student_id,
        Student.last_name,
        Student.first_name,
        Student.course,
        Student.year_level,
        Subject.subject_code,
        Subject.subject_name,
        Grade.midterm,
        Grade.finals,
        Grade.grade,
        Grade.remarks,
        Grade.semester,
        Grade.school_year
    ).join(Student, Grade.student_id == Student.student_id)\
     .join(Subject, Grade.subject_id == Subject.subject_id)\
     .distinct()\
     .order_by(Student.course, Student.year_level, Student.last_name, Student.first_name)\
     .all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Last Name", "First Name", "Course", "Year Level", "Subject Code", 
        "Subject Description", "Midterm", "Finals", "Final Grade", 
        "Remarks", "Semester", "School Year"
    ])
    
    for row in results:
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_grade_report.csv"}
    )

@router.get("/summary", status_code=200)
@router.get("/grade-summary", status_code=200)
def export_summary_report(db: Session = Depends(get_db)):
    """Generates a CSV report summarizing GWA and units for all students."""
    # 1. Fetch all students
    students = db.query(Student).order_by(Student.course, Student.year_level, Student.last_name).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Last Name", "First Name", "Course", 
        "Year Level", "Total Units", "GWA", "Status"
    ])

    for s in students:
        # Logic to compute GWA per student (similar to student_routes.py)
        # We join with Subject to get the unit weights
        grades = db.query(Grade, Subject.unit).join(
            Subject, Grade.subject_id == Subject.subject_id
        ).filter(Grade.student_id == s.student_id).all()

        total_weighted_grade = 0.0
        total_units = 0.0
        
        for g, unit_val in grades:
            # Only count Passed/Failed for GWA
            if g.remarks in ["Passed", "Failed"] and g.grade is not None:
                if unit_val:
                    unit = float(unit_val)
                    # Higher education GWA formula: (Grade * Units) / Total Units
                    if g.grade > 0:
                        total_weighted_grade += float(g.grade) * unit
                        total_units += unit
        
        gwa = "N/A"
        if total_units > 0:
            gwa = round(total_weighted_grade / total_units, 4)

        writer.writerow([
            s.student_id,
            s.last_name,
            s.first_name,
            s.course,
            s.year_level,
            total_units,
            gwa,
            s.status
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_grade_summary.csv"}
    )

@router.get("/deficiency", status_code=200)
def export_deficiency_report(db: Session = Depends(get_db)):
    """Generates a CSV report of all active and resolved deficiencies."""
    results = db.query(
        Deficiency.student_id,
        Student.last_name,
        Student.first_name,
        Student.course,
        Subject.subject_code,
        Deficiency.type,
        Deficiency.status,
        Deficiency.semester,
        Deficiency.school_year,
        Deficiency.date_recorded
    ).join(Student, Deficiency.student_id == Student.student_id)\
     .join(Subject, Deficiency.subject_id == Subject.subject_id)\
     .distinct()\
     .order_by(Student.last_name, Deficiency.status)\
     .all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Last Name", "First Name", "Course", "Subject Code", 
        "Type", "Status", "Semester", "School Year", "Date Recorded"
    ])
    
    for row in results:
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=deficiencies_report.csv"}
    )

@router.get("/enrollment", status_code=200)
def export_enrollment_report(db: Session = Depends(get_db)):
    """Generates a CSV report of all subject enrollments."""
    results = db.query(
        Enrollment.student_id,
        Student.last_name,
        Student.first_name,
        Student.course,
        Student.year_level,
        Subject.subject_code,
        Enrollment.semester,
        Enrollment.school_year,
        Enrollment.instructor,
        Enrollment.date_enrolled
    ).join(Student, Enrollment.student_id == Student.student_id)\
     .join(Subject, Enrollment.subject_id == Subject.subject_id)\
     .distinct()\
     .order_by(Enrollment.school_year, Enrollment.semester, Student.course, Student.last_name)\
     .all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Last Name", "First Name", "Course", "Year Level", "Subject Code", 
        "Semester", "School Year", "Instructor", "Date Enrolled"
    ])
    
    for row in results:
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enrollments_report.csv"}
    )