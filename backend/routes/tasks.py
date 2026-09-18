from flask import Blueprint, request, jsonify, g
from db.database import get_db, row_to_dict, rows_to_list
from auth.utils import require_auth, error_response
from auth.validation import (
    ValidationErrors, require_str, optional_str, optional_enum, require_enum,
    require_int, optional_int, validate_date_str,
)
from routes.notifications import create_notification

bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

STATUSES = ['todo', 'in-progress', 'done']
PRIORITIES = ['low', 'medium', 'high']


def has_project_access(db, project_id, user_id):
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return None
    if project['ownerId'] == user_id:
        return project
    is_member = db.execute(
        'SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?', (project_id, user_id)
    ).fetchone()
    return project if is_member else None


def with_assignee(db, task):
    if not task:
        return task
    result = dict(task)
    if task['assigneeId']:
        assignee = db.execute(
            'SELECT id, name, email FROM users WHERE id = ?', (task['assigneeId'],)
        ).fetchone()
        result['assignee'] = row_to_dict(assignee)
    else:
        result['assignee'] = None
    return result


@bp.get('')
@require_auth
def list_tasks():
    try:
        project_id = require_int(request.args.to_dict(), 'projectId', 'projectId')
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()
    project = has_project_access(db, project_id, g.user['id'])
    if not project:
        return error_response(403, "You don't have access to this project.")

    rows = db.execute(
        'SELECT * FROM tasks WHERE projectId = ? ORDER BY status, position ASC, createdAt DESC', (project_id,)
    ).fetchall()
    tasks = [with_assignee(db, t) for t in rows]
    return jsonify({'tasks': tasks})


def parse_task_body(data):
    title = require_str(data, 'title', 'Title', 3, 120)
    description = optional_str(data, 'description', 'Description', 1000)
    status = optional_enum(data, 'status', 'Status', STATUSES, default='todo')
    priority = optional_enum(data, 'priority', 'Priority', PRIORITIES, default='medium')
    due_date = validate_date_str(data, 'dueDate')
    assignee_id = optional_int(data, 'assigneeId', 'Assignee')
    project_id = require_int(data, 'projectId', 'A project is required')
    return title, description, status, priority, due_date, assignee_id, project_id


@bp.post('')
@require_auth
def create_task():
    data = request.get_json(silent=True) or {}
    try:
        title, description, status, priority, due_date, assignee_id, project_id = parse_task_body(data)
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()
    project = has_project_access(db, project_id, g.user['id'])
    if not project:
        return error_response(403, "You don't have access to this project.")

    if assignee_id:
        is_assignee_member = db.execute(
            'SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?', (project_id, assignee_id)
        ).fetchone()
        if not is_assignee_member:
            return error_response(422, 'Assignee must be a project member.', 'assigneeId')

    max_pos_row = db.execute(
        'SELECT COALESCE(MAX(position), -1) as m FROM tasks WHERE projectId = ? AND status = ?',
        (project_id, status),
    ).fetchone()
    next_pos = max_pos_row['m'] + 1

    cur = db.execute(
        """INSERT INTO tasks (title, description, status, priority, assigneeId, dueDate, projectId, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, description, status, priority, assignee_id, due_date, project_id, next_pos),
    )
    db.commit()

    if assignee_id and assignee_id != g.user['id']:
        actor = db.execute('SELECT name FROM users WHERE id = ?', (g.user['id'],)).fetchone()
        actor_name = actor['name'] if actor else 'Someone'
        create_notification(
            db, assignee_id, g.user['id'],
            'New Task Assigned',
            f"{actor_name} assigned you to '{title}' in {project['title']}.",
            cur.lastrowid, project_id,
        )
        db.commit()

    task = db.execute('SELECT * FROM tasks WHERE id = ?', (cur.lastrowid,)).fetchone()
    return jsonify({'task': with_assignee(db, task)}), 201


@bp.put('/<int:task_id>')
@require_auth
def update_task(task_id):
    db = get_db()
    existing = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not existing:
        return error_response(404, 'Task not found.')

    project = has_project_access(db, existing['projectId'], g.user['id'])
    if not project:
        return error_response(403, "You don't have access to this project.")

    data = request.get_json(silent=True) or {}
    try:
        title = require_str(data, 'title', 'Title', 3, 120)
        description = optional_str(data, 'description', 'Description', 1000)
        status = optional_enum(data, 'status', 'Status', STATUSES, default=existing['status'])
        priority = optional_enum(data, 'priority', 'Priority', PRIORITIES, default=existing['priority'])
        due_date = validate_date_str(data, 'dueDate')
        assignee_id = optional_int(data, 'assigneeId', 'Assignee')
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    if assignee_id:
        is_assignee_member = db.execute(
            'SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?',
            (existing['projectId'], assignee_id),
        ).fetchone()
        if not is_assignee_member:
            return error_response(422, 'Assignee must be a project member.', 'assigneeId')

    db.execute(
        """UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigneeId = ?, dueDate = ?,
           updatedAt = datetime('now') WHERE id = ?""",
        (title, description, status, priority, assignee_id, due_date, task_id),
    )
    db.commit()

    if assignee_id and assignee_id != existing['assigneeId'] and assignee_id != g.user['id']:
        actor = db.execute('SELECT name FROM users WHERE id = ?', (g.user['id'],)).fetchone()
        actor_name = actor['name'] if actor else 'Someone'
        create_notification(
            db, assignee_id, g.user['id'],
            'Task Assigned to You',
            f"{actor_name} assigned you to '{title}' in {project['title']}.",
            task_id, existing['projectId'],
        )
        db.commit()

    task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    return jsonify({'task': with_assignee(db, task)})


@bp.patch('/<int:task_id>/move')
@require_auth
def move_task(task_id):
    db = get_db()
    existing = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not existing:
        return error_response(404, 'Task not found.')

    project = has_project_access(db, existing['projectId'], g.user['id'])
    if not project:
        return error_response(403, "You don't have access to this project.")

    data = request.get_json(silent=True) or {}
    try:
        status = require_enum(data, 'status', 'Status', STATUSES)
        position = require_int(data, 'position', 'Position')
        if position < 0:
            raise ValidationErrors([{'field': 'position', 'message': 'Position must be a non-negative integer.'}])
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    # Shift tasks in the destination column to make room, then place this one
    db.execute(
        'UPDATE tasks SET position = position + 1 WHERE projectId = ? AND status = ? AND position >= ? AND id != ?',
        (existing['projectId'], status, position, task_id),
    )
    db.execute(
        "UPDATE tasks SET status = ?, position = ?, updatedAt = datetime('now') WHERE id = ?",
        (status, position, task_id),
    )
    db.commit()

    task = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    return jsonify({'task': with_assignee(db, task)})


@bp.delete('/<int:task_id>')
@require_auth
def delete_task(task_id):
    db = get_db()
    existing = db.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
    if not existing:
        return error_response(404, 'Task not found.')

    project = has_project_access(db, existing['projectId'], g.user['id'])
    if not project:
        return error_response(403, "You don't have access to this project.")

    db.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    db.commit()
    return jsonify({'message': 'Task deleted.'})


@bp.get('/calendar')
@require_auth
def get_calendar_tasks():
    db = get_db()
    user_id = g.user['id']
    workspace_id = request.args.get('workspaceId', type=int)
    project_id = request.args.get('projectId', type=int)
    my_only = request.args.get('myOnly', '').lower() in ('true', '1')

    query = """
        SELECT t.*, p.title as projectTitle, p.workspaceId,
               u.id as assignee_id, u.name as assignee_name, u.email as assignee_email
        FROM tasks t
        JOIN projects p ON p.id = t.projectId
        LEFT JOIN project_members pm ON pm.projectId = p.id AND pm.userId = ?
        LEFT JOIN users u ON u.id = t.assigneeId
        WHERE (p.ownerId = ? OR pm.userId = ?) AND t.dueDate IS NOT NULL AND t.dueDate != ''
    """
    params = [user_id, user_id, user_id]

    if workspace_id:
        query += " AND p.workspaceId = ?"
        params.append(workspace_id)
    if project_id:
        query += " AND t.projectId = ?"
        params.append(project_id)
    if my_only:
        query += " AND t.assigneeId = ?"
        params.append(user_id)

    query += " ORDER BY t.dueDate ASC, t.priority DESC"
    rows = db.execute(query, tuple(params)).fetchall()

    tasks = []
    for r in rows:
        item = dict(r)
        if item['assignee_id']:
            item['assignee'] = {
                'id': item['assignee_id'],
                'name': item['assignee_name'],
                'email': item['assignee_email'],
            }
        else:
            item['assignee'] = None
        item.pop('assignee_id', None)
        item.pop('assignee_name', None)
        item.pop('assignee_email', None)
        tasks.append(item)

    return jsonify({'tasks': tasks})

