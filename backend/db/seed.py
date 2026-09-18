"""Demo data seed script: `python db/seed.py`
Seeds demo users, Upaya Team company workspace with designated departments
(Video Editing Team, Production Team, Graphic Team), tasks with due dates, and alerts.
"""
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import bcrypt
from db.database import apply_schema, DB_PATH
import sqlite3

apply_schema()

conn = sqlite3.connect(DB_PATH)
conn.execute('PRAGMA foreign_keys = ON')
cur = conn.cursor()

cur.executescript(
    "DELETE FROM notifications; DELETE FROM tasks; DELETE FROM project_members; "
    "DELETE FROM workspace_members; DELETE FROM projects; DELETE FROM workspaces; "
    "DELETE FROM users;"
)

password_hash = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')

# 1. Demo Users
users_data = [
    ('Alice Sharma', 'alice@taskflow.dev', 'admin'),
    ('Aashika Prajapati', 'aashika@taskflow.dev', 'admin'),
    ('Bob Thapa', 'bob@taskflow.dev', 'member'),
    ('Chloe Gurung', 'chloe@taskflow.dev', 'member'),
    ('Matina Maharjan', 'matina@taskflow.dev', 'member'),
]

user_ids = {}
for name, email, role in users_data:
    cur.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        (name, email, password_hash, role),
    )
    user_ids[email] = cur.lastrowid

alice_id = user_ids['alice@taskflow.dev']
aashika_id = user_ids['aashika@taskflow.dev']
bob_id = user_ids['bob@taskflow.dev']
chloe_id = user_ids['chloe@taskflow.dev']
matina_id = user_ids['matina@taskflow.dev']

# 2. Company Workspace: "Upaya Team"
cur.execute(
    'INSERT INTO workspaces (name, companyType, ownerId) VALUES (?, ?, ?)',
    ('Upaya Team', 'agency', alice_id),
)
ws_id = cur.lastrowid

# Workspace Members
cur.execute('INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)', (ws_id, alice_id, 'owner'))
cur.execute('INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)', (ws_id, aashika_id, 'admin'))
cur.execute('INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)', (ws_id, bob_id, 'member'))
cur.execute('INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)', (ws_id, chloe_id, 'member'))
cur.execute('INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)', (ws_id, matina_id, 'member'))

# 3. Designated Departments
cur.execute(
    'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
    ('Video Editing Team', 'Commercial video edits, reels, color grading, and audio syncing.', alice_id, ws_id),
)
dept_video = cur.lastrowid

cur.execute(
    'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
    ('Production Team', 'Studio scheduling, camera crew logistics, lighting, and gear management.', alice_id, ws_id),
)
dept_prod = cur.lastrowid

cur.execute(
    'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
    ('Graphic Team', 'Thumbnails, brand kits, social campaign carousels, and poster layouts.', aashika_id, ws_id),
)
dept_graphic = cur.lastrowid

# Department Members
for dept_id, u_ids in [
    (dept_video, [alice_id, bob_id, aashika_id]),
    (dept_prod, [alice_id, chloe_id, matina_id]),
    (dept_graphic, [aashika_id, alice_id, bob_id, chloe_id]),
]:
    for uid in u_ids:
        cur.execute('INSERT INTO project_members (projectId, userId) VALUES (?, ?)', (dept_id, uid))

# 4. Tasks across departments with realistic September 2026 due dates
tasks_data = [
    # Video Editing Team
    ('Rough cut for Upaya Brand Campaign', 'Assemble raw clips into 60s teaser with baseline pacing.', 'done', 'high', bob_id, '2026-09-15', dept_video, 0),
    ('Audio mixing and SFX balancing', 'Clean dialogue tracks, EQ background music, sync sound effects.', 'in-progress', 'medium', aashika_id, '2026-09-18', dept_video, 0),
    ('Color grading final delivery', 'Apply cinematic LUT, balance skin tones in DaVinci Resolve.', 'todo', 'high', bob_id, '2026-09-22', dept_video, 0),
    ('Export vertical 9:16 cuts for TikTok & Reels', 'Reposition key subjects for vertical framing.', 'todo', 'low', alice_id, '2026-09-24', dept_video, 1),

    # Production Team
    ('Reserve 4K cinema cameras and boom mics', 'Check gear inventory for outdoor shoot on Saturday.', 'done', 'high', chloe_id, '2026-09-14', dept_prod, 0),
    ('Scout rooftop shoot location', 'Check sunset golden hour angles and power outlet availability.', 'in-progress', 'high', matina_id, '2026-09-19', dept_prod, 0),
    ('Coordinate talent call sheets', 'Email actors and crew with timing, makeup calls, and warding instructions.', 'todo', 'medium', chloe_id, '2026-09-20', dept_prod, 0),
    ('Battery charge and backup hard drive prep', 'Format three 2TB Rugged SSDs and charge V-mount batteries.', 'todo', 'low', matina_id, '2026-09-21', dept_prod, 1),

    # Graphic Team
    ('Create YouTube 4K thumbnail variants', 'Test 3 expressive expressions and high-contrast typography.', 'done', 'high', bob_id, '2026-09-16', dept_graphic, 0),
    ('Design social media carousel assets', '10-slide education carousel explaining project management.', 'in-progress', 'medium', chloe_id, '2026-09-19', dept_graphic, 0),
    ('Render 3D product badge for website hero', 'Transparent PNG render with subtle rim lighting.', 'todo', 'high', aashika_id, '2026-09-23', dept_graphic, 0),
    ('Vector iconography pack for dashboard', '16 custom SVG icons in outlined and filled weights.', 'todo', 'low', bob_id, '2026-09-26', dept_graphic, 1),
]

task_ids = []
for title, description, status, priority, assignee_id, due_date, project_id, position in tasks_data:
    cur.execute(
        """INSERT INTO tasks (title, description, status, priority, assigneeId, dueDate, projectId, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, description, status, priority, assignee_id, due_date, project_id, position),
    )
    task_ids.append(cur.lastrowid)

# 5. Notifications for assigned tasks
notifs_data = [
    (bob_id, alice_id, task_ids[2], dept_video, 'New Task Assigned', "Alice Sharma assigned you to 'Color grading final delivery' in Video Editing Team."),
    (aashika_id, alice_id, task_ids[1], dept_video, 'New Task Assigned', "Alice Sharma assigned you to 'Audio mixing and SFX balancing' in Video Editing Team."),
    (matina_id, alice_id, task_ids[5], dept_prod, 'New Task Assigned', "Alice Sharma assigned you to 'Scout rooftop shoot location' in Production Team."),
    (chloe_id, alice_id, task_ids[6], dept_prod, 'New Task Assigned', "Alice Sharma assigned you to 'Coordinate talent call sheets' in Production Team."),
    (aashika_id, alice_id, task_ids[10], dept_graphic, 'New Task Assigned', "Alice Sharma assigned you to 'Render 3D product badge for website hero' in Graphic Team."),
]

for user_id, actor_id, task_id, project_id, title, message in notifs_data:
    cur.execute(
        """INSERT INTO notifications (userId, actorId, taskId, projectId, title, message, isRead)
           VALUES (?, ?, ?, ?, ?, ?, 0)""",
        (user_id, actor_id, task_id, project_id, title, message),
    )

conn.commit()
conn.close()

print('Seed complete!')
print('Created workspace "Upaya Team" with 3 departments:')
print('  - Video Editing Team')
print('  - Production Team')
print('  - Graphic Team')
print('\nDemo accounts (all use password: password123):')
print('  alice@taskflow.dev     (admin / workspace owner)')
print('  aashika@taskflow.dev   (admin)')
print('  bob@taskflow.dev       (member)')
print('  chloe@taskflow.dev     (member)')
print('  matina@taskflow.dev    (member)')
