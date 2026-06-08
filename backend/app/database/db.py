from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.engine import Engine
import os
from pathlib import Path

# Use SQLite stored next to the app folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "smrs.db"
DB_URL = os.getenv("DB_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This listener ensures that SQLite enforces Foreign Key constraints.
# Without this, deleting a student wouldn't automatically delete their grades.
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from ..models import students_model, grade_model, deficiencies_model, curriculum_model, subjects_model, import_log_model, enrollment_model
    Base.metadata.create_all(bind=engine)
    
    # Manual Migration: Add 'adviser' column if it doesn't exist in the physical DB
    inspector = inspect(engine)
    if 'students' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('students')]
        if 'adviser' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE students ADD COLUMN adviser TEXT"))
                conn.commit()

    print(f"[DB] Database initialized at {DB_PATH}")
