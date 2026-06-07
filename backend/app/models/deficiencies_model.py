from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database.db import Base

class Deficiency(Base):
    __tablename__ = "deficiencies"

    deficiency_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Student IDs are stored as strings in `students_model.Student.student_id`
    student_id    = Column(String, ForeignKey("students.student_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    subject_id    = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    type          = Column(String, nullable=True)  # Incomplete / Failed / Dropped / Other
    status        = Column(String, default="pending")  # pending / resolved
    semester      = Column(String, nullable=True)
    deadline      = Column(String, nullable=True)
    remarks       = Column(String, nullable=True)
    date_recorded = Column(String, nullable=True)
    date_resolved = Column(String, nullable=True)
    school_year   = Column(String, nullable=True)

    student = relationship("Student", back_populates="deficiencies")
