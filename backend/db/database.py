import os
import sqlite3
from flask import g

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'taskflow.sqlite'))
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')


def get_db():
    """Returns a request-scoped SQLite connection (one per request, via Flask's g)."""
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_app(app):
    app.teardown_appcontext(close_db)


def apply_schema():
    """Applies schema.sql - safe to run every boot since every statement is idempotent."""
    conn = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH, 'r') as f:
        conn.executescript(f.read())
    user_columns = {row[1] for row in conn.execute('PRAGMA table_info(users)').fetchall()}
    if 'companyType' not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN companyType TEXT DEFAULT ''")
    conn.commit()
    conn.close()


def row_to_dict(row):
    return dict(row) if row is not None else None


def rows_to_list(rows):
    return [dict(r) for r in rows]
