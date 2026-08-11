# TaskFlow

A team project management system with projects, a Kanban task board, and a dashboard overview. Built as a 4th-semester college project.

**Stack:** React (Vite) + Tailwind CSS · Node.js + Express · SQLite (`better-sqlite3`) · JWT auth · `react-hook-form` + `zod` (client) mirrored by `express-validator` (server).

---

## Project structure

```
taskflow/
├── backend/
│   ├── db/
│   │   ├── schema.sql       # table definitions (users, projects, project_members, tasks)
│   │   ├── db.js            # sqlite connection, applies schema on boot
│   │   ├── migrate.js       # standalone migration runner (npm run migrate)
│   │   └── seed.js          # demo data for grading (npm run seed)
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   └── validate.js      # express-validator error formatter
│   ├── routes/
│   │   ├── auth.js          # register, login, logout, me, user search
│   │   ├── projects.js      # project CRUD + member management
│   │   ├── tasks.js         # task CRUD + drag-and-drop move endpoint
│   │   └── dashboard.js     # aggregate overview data
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/              # axios client + endpoint wrappers
    │   ├── components/       # Kanban board, modals, form fields, layout
    │   ├── context/          # Auth, Toast, Projects (sidebar) contexts
    │   ├── lib/               # zod schemas, formatting helpers
    │   └── pages/             # Login, Register, Dashboard, Project (board)
    ├── tailwind.config.js
    └── package.json
```

## Prerequisites

- Node.js 18+ and npm

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET before any real deployment
npm run migrate           # creates db/taskflow.sqlite and applies schema
npm run seed               # optional: loads demo users/projects/tasks
npm run dev                 # starts the API on http://localhost:4000
```

Demo accounts created by `npm run seed` (password for all: `password123`):

| Email                 | Role   |
|------------------------|--------|
| alice@taskflow.dev    | admin  |
| bob@taskflow.dev      | member |
| chloe@taskflow.dev    | member |

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev                 # starts Vite on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:4000`, so no CORS configuration is needed in development (`vite.config.js`).

Open **http://localhost:5173** and log in with a seeded account, or register a new one.

## Running in production mode

```bash
# backend
cd backend && npm start

# frontend
cd frontend && npm run build && npm run preview
```

For a real deployment, set `CLIENT_ORIGIN` in `backend/.env` to your frontend's URL, and generate a strong random `JWT_SECRET`.

## Features

- **Auth** — register/login with bcrypt-hashed passwords, JWT-protected API routes, persisted session via localStorage.
- **Projects** — create, edit, delete; owners can add/remove members by searching users.
- **Tasks** — create, edit, delete; organized into a 3-column Kanban board (To do / In progress / Done) with drag-and-drop powered by `@dnd-kit`. Drops are persisted optimistically and rolled back on API failure.
- **Dashboard** — task counts by status across all your projects, per-project progress bars, and a list of tasks assigned to you.
- **Validation** — every create/edit form validates client-side with `zod` (matching the server's `express-validator` rules) and shows inline field errors; the server re-validates independently and returns the same field/message shape so bad data never reaches the database even if the client is bypassed.

## Database schema

See `backend/db/schema.sql`. Summary:

- `users (id, name, email, password, role, createdAt)`
- `projects (id, title, description, ownerId, createdAt)`
- `project_members (projectId, userId, addedAt)` — join table
- `tasks (id, title, description, status, priority, assigneeId, dueDate, projectId, position, createdAt, updatedAt)`

`npm run migrate` is safe to re-run — every statement uses `CREATE TABLE IF NOT EXISTS`.

## Notes for grading

- `npm run seed` truncates and reloads demo data — run it any time to reset the database to a clean, populated state before a demo.
- The backend was manually verified end-to-end (register/login, dashboard aggregation, project + task CRUD, drag-and-drop move endpoint) before delivery.
