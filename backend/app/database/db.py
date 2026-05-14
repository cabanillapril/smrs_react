from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from pathlib import Path

# Use SQLite stored next to the app folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "smrs.db"
DB_URL = os.getenv("DB_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from ..models import students_model, grade_model, deficiencies_model, curriculum_model, subjects_model
    Base.metadata.create_all(bind=engine)
    print(f"[DB] Database initialized at {DB_PATH}")
