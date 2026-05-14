from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database.db import get_db
from ..models.students_model import Student
from ..models.deficiencies_model import Deficiency

router = APIRouter()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_students      = db.query(func.count(Student.student_number)).scalar() or 0
    active_students     = db.query(func.count(Student.student_number)).filter(Student.status != "Graduated").scalar() or 0
    total_deficiencies  = db.query(func.count(Deficiency.deficiency_id)).scalar() or 0
    pending_deficiencies= db.query(func.count(Deficiency.deficiency_id)).filter(Deficiency.status == "pending").scalar() or 0
    resolved_count      = db.query(func.count(Deficiency.deficiency_id)).filter(Deficiency.status == "resolved").scalar() or 0
    incomplete_count    = db.query(func.count(Deficiency.deficiency_id)).filter(
        Deficiency.reason.ilike("%incomplete%"), Deficiency.status == "pending"
    ).scalar() or 0
    failed_count        = db.query(func.count(Deficiency.deficiency_id)).filter(
        Deficiency.reason.ilike("%failed%"), Deficiency.status == "pending"
    ).scalar() or 0

    return {
        "total_students":       total_students,
        "active_students":      active_students,
        "total_deficiencies":   total_deficiencies,
        "pending_deficiencies": pending_deficiencies,
        "resolved_count":       resolved_count,
        "incomplete_count":     incomplete_count,
        "failed_count":         failed_count,
    }
