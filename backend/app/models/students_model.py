from sqlalchemy import Column, Integer, String, Date
from ..database.db import Base

class Student(Base):
    __tablename__ = "students"

    student_number = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id     = Column(String, unique=True, nullable=True)
    first_name     = Column(String, nullable=False)
    middle_name    = Column(String, nullable=True)
    last_name      = Column(String, nullable=False)
    birthday       = Column(String, nullable=True)   # stored as ISO date string
    gender         = Column(String, nullable=True)
    address        = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    email          = Column(String, nullable=True)
    year_level     = Column(Integer, nullable=True)
    course         = Column(String, nullable=True)
    section        = Column(String, nullable=True)
    status         = Column(String, default="Regular")
    major          = Column(String, nullable=True)
