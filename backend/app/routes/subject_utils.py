from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models.subjects_model import Subject
from typing import Optional

def check_subject_conflict(
    db: Session,
    subject_code: str,
    subject_name: Optional[str] = None,
    units: Optional[int] = None,
    keep_subject: bool = False,
    overwrite_subject: bool = False
):
    """
    Checks if a subject with the same subject_code (case-insensitive) already exists in the database.
    If it exists and has different details:
      - If neither keep_subject nor overwrite_subject is True, raises a HTTP 409 conflict.
      - If keep_subject is True, returns (True, existing_subject) indicating we should NOT update it.
      - If overwrite_subject is True, returns (False, existing_subject) indicating we should update it.
    If no conflict or details match, returns (False, existing_subject).
    """
    if not subject_code:
        return False, None

    code = subject_code.strip().upper()
    existing = db.query(Subject).filter(Subject.subject_code == code).first()
    if not existing:
        return False, None

    has_diff = False
    diff_details = {}

    if subject_name and subject_name.strip():
        incoming_name = subject_name.strip()
        existing_name = (existing.subject_name or "").strip()
        # Only treat as different if they don't match case-insensitively, and incoming name isn't just the code
        if existing_name.lower() != incoming_name.lower() and incoming_name.upper() != code:
            has_diff = True
            diff_details["subject_name"] = {"existing": existing_name, "incoming": incoming_name}

    if units is not None:
        incoming_units = int(units)
        existing_units = existing.unit
        if existing_units != incoming_units:
            has_diff = True
            diff_details["unit"] = {"existing": existing_units, "incoming": incoming_units}

    if has_diff:
        if not keep_subject and not overwrite_subject:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "SUBJECT_CONFLICT",
                    "subject_code": code,
                    "existing": {
                        "subject_name": existing.subject_name,
                        "unit": existing.unit
                    },
                    "incoming": {
                        "subject_name": subject_name,
                        "unit": units
                    }
                }
            )
        elif keep_subject:
            return True, existing
        elif overwrite_subject:
            return False, existing

    return False, existing
