from sqlalchemy import Column, Integer, String, ForeignKey
from ..database.db import Base

class Deficiency(Base):
    __tablename__ = "deficiencies"

    deficiency_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_number = Column(Integer, ForeignKey("students.student_number"), nullable=False)
    subject_id    = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    reason        = Column(String, nullable=False)  # Incomplete / Failed / Dropped / Other
    status        = Column(String, default="pending")  # pending / resolved
    semester      = Column(String, nullable=True)
    deadline      = Column(String, nullable=True)
    remarks       = Column(String, nullable=True)
    date_recorded = Column(String, nullable=True)
    date_resolved = Column(String, nullable=True)
