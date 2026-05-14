from sqlalchemy import Column, Integer, String
from ..database.db import Base

class Subject(Base):
    __tablename__ = "subjects"

    subject_id   = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_code = Column(String, unique=True, nullable=False)
    subject_name = Column(String, nullable=False)
    unit         = Column(Integer, default=3)
    course       = Column(String, nullable=True)
    major        = Column(String, nullable=True)
