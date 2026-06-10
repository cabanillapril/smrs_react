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
    """Generates an organized, readable CSV report of grade records grouped by student."""
    students = db.query(Student).order_by(Student.course, Student.year_level, Student.last_name, Student.first_name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    for student in students:
        grades = db.query(
            Grade.midterm,
            Grade.finals,
            Grade.grade,
            Grade.remarks,
            Grade.semester,
            Grade.school_year,
            Grade.instructor,
            Subject.subject_code,
            Subject.subject_name,
            Subject.unit
        ).join(Subject, Grade.subject_id == Subject.subject_id)\
         .filter(Grade.student_id == student.student_id)\
         .order_by(Grade.school_year, Grade.semester, Subject.subject_code)\
         .all()
         
        if not grades:
            continue
            
        # Write Student Header Info
        writer.writerow(["STUDENT:", f"{student.last_name}, {student.first_name}", "ID:", student.student_id])
        writer.writerow(["Course:", student.course or "—", "Year Level:", student.year_level or "—", "Status:", student.status or "—"])
        writer.writerow([
            "Subject Code", "Subject Description", "Units", "Midterm", "Finals", 
            "Final Grade", "Remarks", "Semester", "School Year", "Instructor"
        ])
        
        total_weighted_grade = 0.0
        total_units = 0.0
        
        for g_mid, g_fin, g_val, g_remarks, g_sem, g_sy, g_instr, s_code, s_name, s_unit in grades:
            writer.writerow([
                s_code, s_name, s_unit,
                g_mid if g_mid is not None else "",
                g_fin if g_fin is not None else "",
                g_val if g_val is not None else "",
                g_remarks,
                g_sem, g_sy, g_instr or "—"
            ])
            
            # GWA calculation
            if g_remarks in ["Passed", "Failed"] and g_val is not None:
                unit = float(s_unit) if s_unit is not None else 3.0
                if g_val > 0:
                    total_weighted_grade += float(g_val) * unit
                    total_units += unit
                    
        gwa = "N/A"
        if total_units > 0:
            gwa = round(total_weighted_grade / total_units, 2)
            
        writer.writerow(["GWA:", gwa, "Total Units Completed:", total_units])
        writer.writerow([])  # Spacer row
        writer.writerow([])  # Spacer row

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
    students = db.query(Student).order_by(Student.course, Student.year_level, Student.last_name).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Last Name", "First Name", "Course", 
        "Year Level", "Total Units", "GWA", "Status"
    ])

    for s in students:
        grades = db.query(Grade, Subject.unit).join(
            Subject, Grade.subject_id == Subject.subject_id
        ).filter(Grade.student_id == s.student_id).all()

        total_weighted_grade = 0.0
        total_units = 0.0
        
        for g, unit_val in grades:
            if g.remarks in ["Passed", "Failed"] and g.grade is not None:
                if unit_val:
                    unit = float(unit_val)
                    if g.grade > 0:
                        total_weighted_grade += float(g.grade) * unit
                        total_units += unit
        
        gwa = "N/A"
        if total_units > 0:
            gwa = round(total_weighted_grade / total_units, 2)

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
    """Generates an organized, readable CSV report of deficiencies grouped by student."""
    students = db.query(Student).order_by(Student.last_name, Student.first_name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    for student in students:
        deficiencies = db.query(
            Deficiency.type,
            Deficiency.status,
            Deficiency.semester,
            Deficiency.school_year,
            Deficiency.date_recorded,
            Subject.subject_code,
            Subject.subject_name
        ).join(Subject, Deficiency.subject_id == Subject.subject_id)\
         .filter(Deficiency.student_id == student.student_id)\
         .order_by(Deficiency.status, Deficiency.school_year)\
         .all()
         
        if not deficiencies:
            continue
            
        writer.writerow(["STUDENT:", f"{student.last_name}, {student.first_name}", "ID:", student.student_id])
        writer.writerow(["Course:", student.course or "—", "Year Level:", student.year_level or "—"])
        writer.writerow(["Subject Code", "Subject Description", "Deficiency Type", "Status", "Semester", "School Year", "Date Recorded"])
        
        for d_type, d_status, d_sem, d_sy, d_date, s_code, s_name in deficiencies:
            writer.writerow([s_code, s_name, d_type, d_status, d_sem, d_sy, d_date])
            
        writer.writerow([])
        writer.writerow([])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=deficiencies_report.csv"}
    )


@router.get("/enrollment", status_code=200)
def export_enrollment_report(db: Session = Depends(get_db)):
    """Generates an organized, readable CSV report of enrollments grouped by student."""
    students = db.query(Student).order_by(Student.last_name, Student.first_name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    for student in students:
        enrollments = db.query(
            Enrollment.semester,
            Enrollment.school_year,
            Enrollment.instructor,
            Enrollment.date_enrolled,
            Enrollment.units,
            Subject.subject_code,
            Subject.subject_name
        ).join(Subject, Enrollment.subject_id == Subject.subject_id)\
         .filter(Enrollment.student_id == student.student_id)\
         .order_by(Enrollment.school_year, Enrollment.semester)\
         .all()
         
        if not enrollments:
            continue
            
        writer.writerow(["STUDENT:", f"{student.last_name}, {student.first_name}", "ID:", student.student_id])
        writer.writerow(["Course:", student.course or "—", "Year Level:", student.year_level or "—"])
        writer.writerow(["Subject Code", "Subject Description", "Units", "Semester", "School Year", "Instructor", "Date Enrolled"])
        
        for e_sem, e_sy, e_instr, e_date, e_units, s_code, s_name in enrollments:
            writer.writerow([s_code, s_name, e_units, e_sem, e_sy, e_instr, e_date])
            
        writer.writerow([])
        writer.writerow([])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enrollments_report.csv"}
    )