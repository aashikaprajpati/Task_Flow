from flask import Blueprint, request, jsonify, g
from db.database import get_db, rows_to_list
from auth.utils import require_auth, error_response
from auth.validation import ValidationErrors, require_str, optional_str, require_int, optional_int

bp = Blueprint('projects', __name__, url_prefix='/api/projects')


def project_with_meta(db, project_id):
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return None

    owner = db.execute('SELECT id, name, email FROM users WHERE id = ?', (project['ownerId'],)).fetchone()
    members = db.execute(
        """SELECT u.id, u.name, u.email FROM project_members pm
           JOIN users u ON u.id = pm.userId WHERE pm.projectId = ?""",
        (project_id,),
    ).fetchall()
    counts_rows = db.execute(
        'SELECT status, COUNT(*) as count FROM tasks WHERE projectId = ? GROUP BY status', (project_id,)
    ).fetchall()

    counts = {'todo': 0, 'in-progress': 0, 'done': 0}
    for r in counts_rows:
        counts[r['status']] = r['count']
    total = sum(counts.values())

    result = dict(project)
    result['owner'] = dict(owner) if owner else None
    result['members'] = rows_to_list(members)
    result['taskCounts'] = counts
    result['totalTasks'] = total
    return result


def assert_access(db, project_id, user_id):
    """Returns (project_row, error_response)."""
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return None, error_response(404, 'Project not found.')
    is_member = db.execute(
        'SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?', (project_id, user_id)
    ).fetchone()
    if project['ownerId'] != user_id and not is_member:
        return None, error_response(403, "You don't have access to this project.")
    return project, None


@bp.get('')
@require_auth
def list_projects():
    db = get_db()
    rows = db.execute(
        """SELECT DISTINCT p.* FROM projects p
           LEFT JOIN project_members pm ON pm.projectId = p.id
           WHERE p.ownerId = ? OR pm.userId = ?
           ORDER BY p.createdAt DESC""",
        (g.user['id'], g.user['id']),
    ).fetchall()
    projects = [project_with_meta(db, p['id']) for p in rows]
    return jsonify({'projects': projects})


@bp.post('')
@require_auth
def create_project():
    data = request.get_json(silent=True) or {}
    try:
        title = require_str(data, 'title', 'Title', 3, 80)
        description = optional_str(data, 'description', 'Description', 500)
        workspace_id = optional_int(data, 'workspaceId', 'Workspace')
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()

    if workspace_id:
        role = db.execute(
            'SELECT workspaceRole FROM workspace_members WHERE workspaceId = ? AND userId = ?',
            (workspace_id, g.user['id']),
        ).fetchone()
        if not role:
            return error_response(403, "You don't have access to this workspace.")

    cur = db.execute(
        'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
        (title, description, g.user['id'], workspace_id),
    )
    db.execute('INSERT INTO project_members (projectId, userId) VALUES (?, ?)', (cur.lastrowid, g.user['id']))
    db.commit()
    return jsonify({'project': project_with_meta(db, cur.lastrowid)}), 201


@bp.get('/<int:project_id>')
@require_auth
def get_project(project_id):
    db = get_db()
    project, err = assert_access(db, project_id, g.user['id'])
    if err:
        return err
    return jsonify({'project': project_with_meta(db, project_id)})


@bp.put('/<int:project_id>')
@require_auth
def update_project(project_id):
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return error_response(404, 'Project not found.')
    if project['ownerId'] != g.user['id']:
        return error_response(403, 'Only the project owner can edit this project.')

    data = request.get_json(silent=True) or {}
    try:
        title = require_str(data, 'title', 'Title', 3, 80)
        description = optional_str(data, 'description', 'Description', 500)
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db.execute('UPDATE projects SET title = ?, description = ? WHERE id = ?', (title, description, project_id))
    db.commit()
    return jsonify({'project': project_with_meta(db, project_id)})


@bp.delete('/<int:project_id>')
@require_auth
def delete_project(project_id):
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return error_response(404, 'Project not found.')
    if project['ownerId'] != g.user['id']:
        return error_response(403, 'Only the project owner can delete this project.')
    db.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    db.commit()
    return jsonify({'message': 'Project deleted.'})


@bp.post('/<int:project_id>/members')
@require_auth
def add_member(project_id):
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return error_response(404, 'Project not found.')
    if project['ownerId'] != g.user['id']:
        return error_response(403, 'Only the project owner can add members.')

    data = request.get_json(silent=True) or {}
    try:
        user_id = require_int(data, 'userId', 'A valid user must be selected')
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    user = db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        return error_response(422, 'That user does not exist.', 'userId')

    try:
        db.execute('INSERT INTO project_members (projectId, userId) VALUES (?, ?)', (project_id, user_id))
        db.commit()
    except Exception:
        return error_response(422, 'That user is already a member.', 'userId')

    return jsonify({'project': project_with_meta(db, project_id)}), 201


@bp.delete('/<int:project_id>/members/<int:user_id>')
@require_auth
def remove_member(project_id, user_id):
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        return error_response(404, 'Project not found.')
    if project['ownerId'] != g.user['id']:
        return error_response(403, 'Only the project owner can remove members.')
    if user_id == project['ownerId']:
        return error_response(422, 'The project owner cannot be removed.')
    db.execute('DELETE FROM project_members WHERE projectId = ? AND userId = ?', (project_id, user_id))
    db.commit()
    return jsonify({'project': project_with_meta(db, project_id)})
