import sqlite3
import os

db_path = "smrs.db"

if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    tables_to_update = {
        "students": "major",
        "subjects": "major",
        "curriculum": "major"
    }

    for table, column in tables_to_update.items():
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} VARCHAR")
            print(f"Added column '{column}' to table '{table}'.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column '{column}' already exists in table '{table}'.")
            else:
                print(f"Error updating table '{table}': {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")
