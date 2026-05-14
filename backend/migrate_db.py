import sqlite3
import os

db_path = r'c:\Users\lenovo\Downloads\smrs\backend\smrs.db'

if not os.path.exists(db_path):
    print("Database not found, nothing to migrate.")
    exit()

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check current columns
    cursor.execute("PRAGMA table_info(students)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Current columns: {columns}")

    if 'student_number' in columns and 'student_id' in columns:
        print("Migrating columns...")
        # SQLite doesn't allow renaming to an existing column name directly
        # So we use a temporary name
        cursor.execute("ALTER TABLE students RENAME COLUMN student_number TO temp_col")
        cursor.execute("ALTER TABLE students RENAME COLUMN student_id TO student_number")
        cursor.execute("ALTER TABLE students RENAME COLUMN temp_col TO student_id")
        
        conn.commit()
        print("DONE: Migration successful!")
    else:
        print("Columns already migrated or mismatching.")

    conn.close()
except Exception as e:
    print(f" Error during migration: {e}")
