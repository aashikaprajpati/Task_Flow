"""Standalone migration runner: `python db/migrate.py`
Safe to re-run - every statement in schema.sql uses IF NOT EXISTS."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from db.database import apply_schema, DB_PATH

apply_schema()
print(f'Schema applied successfully to {DB_PATH}')
