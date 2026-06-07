from sqlalchemy import Column, Integer, String
from ..database.db import Base

class ImportLog(Base):
    __tablename__ = "import_logs"
    
    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type = Column(String, nullable=False) # 'Appraisal' or 'Grade Report'
    filename = Column(String, nullable=True)
    imported_at = Column(String, nullable=False)
    records_created = Column(Integer, default=0)
    status = Column(String, default="Success")
