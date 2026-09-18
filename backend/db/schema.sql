-- TaskFlow schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  companyType TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A workspace is the top-level "company" container (e.g. "Upaya Team").
-- Departments (projects) live inside a workspace.
CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  companyType TEXT DEFAULT '',
  ownerId INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
);

-- Company-wide membership: everyone invited to the workspace, regardless of
-- which specific department(s) they work in. workspaceRole controls whether
-- they can manage departments/members at the company level.
CREATE TABLE IF NOT EXISTS workspace_members (
  workspaceId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  workspaceRole TEXT NOT NULL DEFAULT 'member' CHECK (workspaceRole IN ('owner', 'admin', 'member')),
  addedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspaceId, userId),
  FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  ownerId INTEGER NOT NULL,
  workspaceId INTEGER,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_members (
  projectId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  addedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (projectId, userId),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigneeId INTEGER,
  dueDate TEXT,
  projectId INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigneeId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigneeId);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(userId);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(userId);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspaceId);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  actorId INTEGER NOT NULL,
  taskId INTEGER,
  projectId INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead);

