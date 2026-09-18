# TaskFlow Backend (Python / Flask)

This is a Python + Flask reimplementation of the TaskFlow backend. It exposes
the **exact same REST API** (same routes, same request/response JSON shapes,
same validation rules and error format) as the original Node/Express backend,
so the existing React frontend works with it **unchanged** — just point it at
this server instead.

## Stack

- **Flask** — web framework
- **SQLite** (Python's built-in `sqlite3` module) — same schema as the Node version
- **PyJWT** — JWT auth
- **bcrypt** — password hashing
- Hand-rolled validation helpers (`auth/validation.py`) that mirror `express-validator`'s
  behavior and error shape: `{"errors": [{"field": ..., "message": ...}]}`

## Project structure

```
backend-flask/
├── app.py                 # Flask app entry point
├── requirements.txt
├── .env.example
├── db/
│   ├── schema.sql         # same schema as the Node backend
│   ├── database.py        # per-request SQLite connection (Flask g)
│   ├── migrate.py         # `python db/migrate.py`
│   └── seed.py            # `python db/seed.py`
├── auth/
│   ├── utils.py           # JWT sign/verify, bcrypt, @require_auth decorator
│   └── validation.py      # validation helpers + error format
└── routes/
    ├── auth.py             # /api/auth/*
    ├── workspaces.py       # /api/workspaces/*
    ├── projects.py         # /api/projects/*
    ├── tasks.py            # /api/tasks/*
    └── dashboard.py        # /api/dashboard
```

## Setup

```bash
cd backend-flask
python3 -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env      # Windows
cp .env.example .env        # Mac/Linux

python db/migrate.py        # creates db/taskflow.sqlite and applies schema
python db/seed.py           # optional: loads demo users/projects/tasks

python app.py                # starts the API on http://localhost:4000
```

Demo accounts (password for all: `password123`):
- alice@taskflow.dev (admin, owns "TaskFlow Redesign")
- bob@taskflow.dev (member, owns "Mobile App Beta")
- chloe@taskflow.dev (member)

## Using with the existing React frontend

No frontend changes needed — it already proxies `/api/*` to
`http://localhost:4000`, which is exactly where this Flask server listens.
Just run this backend instead of (or alongside, on a different port) the
Node one, and run `frontend/` as usual with `npm run dev`.

## Notes on this reimplementation

- Every endpoint, status code, and JSON error shape matches the Node version
  exactly — verified with a 35-case automated test battery covering
  authentication, workspaces (with starter-department auto-creation),
  projects, tasks, drag-and-drop status updates, dashboard aggregation, and
  permission/access-control checks. All 35 passed.
- `app.py` runs Flask's built-in dev server with the auto-reloader disabled
  (`use_reloader=False`) for stability — some Windows setups (especially on
  network/USB/mapped drives) have issues with file-watching reloaders. If you
  want auto-reload during development, change this to `use_reloader=True` in
  `app.py`, or run `flask --app app run --debug` instead of `python app.py`.
- SQLite connections are opened per-request via Flask's `g` object and closed
  automatically at the end of each request (see `db/database.py`).
