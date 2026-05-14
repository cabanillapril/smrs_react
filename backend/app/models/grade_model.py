from sqlalchemy import Column, Integer, String, Float, ForeignKey
from ..database.db import Base

class Grade(Base):
    __tablename__ = "grades"

    grade_id    = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_number = Column(Integer, ForeignKey("students.student_number"), nullable=False)
    subject_id  = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    semester    = Column(Integer, nullable=True)
    school_year = Column(String, nullable=True)
    midterm     = Column(Float, nullable=True)
    finals      = Column(Float, nullable=True)
    grade       = Column(Float, nullable=False)
    remarks     = Column(String, nullable=True)  # passed / failed / INC
