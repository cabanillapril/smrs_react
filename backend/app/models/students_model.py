from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..database.db import Base

class Student(Base):
    __tablename__ = "students"

    student_number = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id     = Column(String, unique=True, nullable=True)
    first_name     = Column(String, nullable=False)
    middle_name    = Column(String, nullable=True)
    last_name      = Column(String, nullable=False)
    birthday       = Column(String, nullable=True)   
    gender         = Column(String, nullable=True)
    address        = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    email          = Column(String, nullable=True)
    year_level     = Column(Integer, nullable=True)
    course         = Column(String, nullable=True)
    section        = Column(String, nullable=True)
    status         = Column(String, default="Regular")
    major          = Column(String, nullable=True)
    adviser        = Column(String, nullable=True)

    # Cascading Relationships
    grades = relationship(
        "Grade", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )
    deficiencies = relationship(
        "Deficiency", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )
    enrollments = relationship(
        "Enrollment", 
        back_populates="student", 
        cascade="all, delete-orphan"
    )
