from sqlalchemy import Column, Integer, String, ForeignKey
from ..database.db import Base

class Curriculum(Base):
    __tablename__ = "curriculum"

    curriculum_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course        = Column(String, nullable=False)
    major         = Column(String, nullable=True)
    year_level    = Column(Integer, nullable=False)
    semester      = Column(Integer, nullable=False)
    subject_id    = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
