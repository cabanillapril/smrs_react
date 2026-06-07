from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from ..database.db import Base

class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id    = Column(String, ForeignKey("students.student_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=True)
    subject_id    = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    semester      = Column(Integer, nullable=True)
    school_year   = Column(String, nullable=True)
    instructor    = Column(String, nullable=True)
    schedule      = Column(String, nullable=True)
    units         = Column(Float, nullable=True)
    date_enrolled = Column(String, nullable=True)

    student = relationship("Student", back_populates="enrollments")
