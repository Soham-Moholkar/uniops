"""
Initialize / reset the PostgreSQL database by running SQL scripts.
Usage: python -m app.scripts.init_db
"""

import os
import sys
from sqlalchemy import text
from app.db.relational import engine

SQL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "sql")

SCRIPTS = [
    "schema.sql",
    "seed.sql",
    "views.sql",
    "procedures.sql",
    "triggers.sql",
    # roles.sql requires superuser; skip in dev
]


def run():
    print("=== UniOps DB — PostgreSQL Init ===")
    with engine.connect() as conn:
        for script_name in SCRIPTS:
            path = os.path.join(SQL_DIR, script_name)
            if not os.path.exists(path):
                print(f"  SKIP {script_name} (not found)")
                continue
            print(f"  Running {script_name} ...")
            sql = open(path, "r", encoding="utf-8").read()
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"    ✓ {script_name}")
            except Exception as e:
                conn.rollback()
                print(f"    ✗ {script_name}: {e}")
    print("=== Done ===")


if __name__ == "__main__":
    run()
