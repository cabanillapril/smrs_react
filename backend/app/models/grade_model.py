from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from ..database.db import Base

class Grade(Base):
    __tablename__ = "grades"

    grade_id    = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id  = Column(String, ForeignKey("students.student_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=True)
    subject_id  = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    semester    = Column(Integer, nullable=True)
    school_year = Column(String, nullable=True)
    midterm     = Column(Float, nullable=True)
    finals      = Column(Float, nullable=True)
    grade       = Column(Float, nullable=False)
    remarks     = Column(String, nullable=True)  # passed / failed / INC
    instructor  = Column(String, nullable=True)

    student = relationship("Student", back_populates="grades")
