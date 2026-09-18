from flask import Blueprint, request, jsonify, g
from db.database import get_db, row_to_dict, rows_to_list
from auth.utils import require_auth, error_response
from auth.validation import ValidationErrors, require_str, optional_str, optional_enum, require_int

bp = Blueprint('workspaces', __name__, url_prefix='/api/workspaces')

COMPANY_TYPES = ['agency', 'tech', 'financial', 'consulting', 'production', 'other']

STARTER_DEPARTMENTS = {
    'agency': ['Video Editing', 'Graphic Design', 'Client Accounts', 'Production'],
    'tech': ['Frontend', 'Backend', 'QA', 'DevOps'],
    'financial': ['Compliance', 'Client Services', 'Reporting', 'Audit'],
    'consulting': ['Client Engagements', 'Research', 'Proposals'],
    'production': ['Pre-Production', 'Production', 'Post-Production'],
    'other': [],
}


def workspace_with_meta(db, workspace_id):
    workspace = db.execute('SELECT * FROM workspaces WHERE id = ?', (workspace_id,)).fetchone()
    if not workspace:
        return None

    members = db.execute(
        """SELECT u.id, u.name, u.email, wm.workspaceRole FROM workspace_members wm
           JOIN users u ON u.id = wm.userId WHERE wm.workspaceId = ?
           ORDER BY CASE wm.workspaceRole WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name""",
        (workspace_id,),
    ).fetchall()

    departments = db.execute(
        'SELECT id, title, description, ownerId, createdAt FROM projects WHERE workspaceId = ? ORDER BY createdAt ASC',
        (workspace_id,),
    ).fetchall()

    department_summaries = []
    for d in departments:
        counts_rows = db.execute(
            'SELECT status, COUNT(*) as count FROM tasks WHERE projectId = ? GROUP BY status', (d['id'],)
        ).fetchall()
        counts = {'todo': 0, 'in-progress': 0, 'done': 0}
        for r in counts_rows:
            counts[r['status']] = r['count']
        total = sum(counts.values())
        member_count = db.execute(
            'SELECT COUNT(*) as n FROM project_members WHERE projectId = ?', (d['id'],)
        ).fetchone()['n']
        item = dict(d)
        item['taskCounts'] = counts
        item['totalTasks'] = total
        item['memberCount'] = member_count
        department_summaries.append(item)

    result = dict(workspace)
    result['members'] = rows_to_list(members)
    result['departments'] = department_summaries
    return result


def get_role(db, workspace_id, user_id):
    row = db.execute(
        'SELECT workspaceRole FROM workspace_members WHERE workspaceId = ? AND userId = ?', (workspace_id, user_id)
    ).fetchone()
    return row['workspaceRole'] if row else None


def assert_member(db, workspace_id, user_id):
    """Returns (workspace_row, role, error_response) - error_response is None on success."""
    workspace = db.execute('SELECT * FROM workspaces WHERE id = ?', (workspace_id,)).fetchone()
    if not workspace:
        return None, None, error_response(404, 'Workspace not found.')
    role = get_role(db, workspace_id, user_id)
    if not role:
        return None, None, error_response(403, "You don't have access to this workspace.")
    return workspace, role, None


def assert_admin(db, workspace_id, user_id):
    workspace, role, err = assert_member(db, workspace_id, user_id)
    if err:
        return None, None, err
    if role not in ('owner', 'admin'):
        return None, None, error_response(403, 'Only workspace admins can do this.')
    return workspace, role, None


@bp.get('')
@require_auth
def list_workspaces():
    db = get_db()
    rows = db.execute(
        """SELECT w.* FROM workspaces w
           JOIN workspace_members wm ON wm.workspaceId = w.id
           WHERE wm.userId = ? ORDER BY w.createdAt ASC""",
        (g.user['id'],),
    ).fetchall()
    workspaces = [workspace_with_meta(db, w['id']) for w in rows]
    return jsonify({'workspaces': workspaces})


@bp.post('')
@require_auth
def create_workspace():
    data = request.get_json(silent=True) or {}
    try:
        name = require_str(data, 'name', 'Workspace name', 2, 80)
        company_type = optional_enum(data, 'companyType', 'Company type', COMPANY_TYPES, default='') or ''
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()
    cur = db.execute(
        'INSERT INTO workspaces (name, companyType, ownerId) VALUES (?, ?, ?)',
        (name, company_type, g.user['id']),
    )
    workspace_id = cur.lastrowid

    db.execute(
        'INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)',
        (workspace_id, g.user['id'], 'owner'),
    )

    departments_input = data.get('departments')
    if isinstance(departments_input, list) and len(departments_input) > 0:
        starters = [d.strip() for d in departments_input if isinstance(d, str) and d.strip()]
    else:
        starters = STARTER_DEPARTMENTS.get(company_type, [])

    for title in starters:
        p_cur = db.execute(
            'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
            (title, '', g.user['id'], workspace_id),
        )
        db.execute(
            'INSERT INTO project_members (projectId, userId) VALUES (?, ?)', (p_cur.lastrowid, g.user['id'])
        )

    db.commit()
    return jsonify({'workspace': workspace_with_meta(db, workspace_id)}), 201


@bp.get('/meta/company-types')
@require_auth
def company_types():
    return jsonify({'companyTypes': COMPANY_TYPES})


@bp.get('/<int:workspace_id>')
@require_auth
def get_workspace(workspace_id):
    db = get_db()
    _, _, err = assert_member(db, workspace_id, g.user['id'])
    if err:
        return err
    return jsonify({'workspace': workspace_with_meta(db, workspace_id)})


@bp.put('/<int:workspace_id>')
@require_auth
def update_workspace(workspace_id):
    db = get_db()
    _, _, err = assert_admin(db, workspace_id, g.user['id'])
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        name = require_str(data, 'name', 'Workspace name', 2, 80)
        company_type = optional_enum(data, 'companyType', 'Company type', COMPANY_TYPES, default='') or ''
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db.execute('UPDATE workspaces SET name = ?, companyType = ? WHERE id = ?', (name, company_type, workspace_id))
    db.commit()
    return jsonify({'workspace': workspace_with_meta(db, workspace_id)})


@bp.delete('/<int:workspace_id>')
@require_auth
def delete_workspace(workspace_id):
    db = get_db()
    workspace = db.execute('SELECT * FROM workspaces WHERE id = ?', (workspace_id,)).fetchone()
    if not workspace:
        return error_response(404, 'Workspace not found.')
    if workspace['ownerId'] != g.user['id']:
        return error_response(403, 'Only the workspace owner can delete it.')
    db.execute('DELETE FROM workspaces WHERE id = ?', (workspace_id,))
    db.commit()
    return jsonify({'message': 'Workspace deleted.'})


@bp.post('/<int:workspace_id>/members')
@require_auth
def add_member(workspace_id):
    db = get_db()
    _, _, err = assert_admin(db, workspace_id, g.user['id'])
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        user_id = require_int(data, 'userId', 'A valid user must be selected')
        role = optional_enum(data, 'workspaceRole', 'Role', ['admin', 'member'], default='member')
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    user = db.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        return error_response(422, 'That user does not exist.', 'userId')

    try:
        db.execute(
            'INSERT INTO workspace_members (workspaceId, userId, workspaceRole) VALUES (?, ?, ?)',
            (workspace_id, user_id, role),
        )
        db.commit()
    except Exception:
        return error_response(422, 'That user is already in this workspace.', 'userId')

    return jsonify({'workspace': workspace_with_meta(db, workspace_id)}), 201


@bp.delete('/<int:workspace_id>/members/<int:user_id>')
@require_auth
def remove_member(workspace_id, user_id):
    db = get_db()
    workspace, _, err = assert_admin(db, workspace_id, g.user['id'])
    if err:
        return err
    if user_id == workspace['ownerId']:
        return error_response(422, 'The workspace owner cannot be removed.')
    db.execute('DELETE FROM workspace_members WHERE workspaceId = ? AND userId = ?', (workspace_id, user_id))
    db.commit()
    return jsonify({'workspace': workspace_with_meta(db, workspace_id)})


@bp.post('/<int:workspace_id>/departments')
@require_auth
def add_department(workspace_id):
    db = get_db()
    _, _, err = assert_admin(db, workspace_id, g.user['id'])
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        title = require_str(data, 'title', 'Department name', 2, 80)
        description = optional_str(data, 'description', 'Description', 500)
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    cur = db.execute(
        'INSERT INTO projects (title, description, ownerId, workspaceId) VALUES (?, ?, ?, ?)',
        (title, description, g.user['id'], workspace_id),
    )
    db.execute('INSERT INTO project_members (projectId, userId) VALUES (?, ?)', (cur.lastrowid, g.user['id']))
    db.commit()
    return jsonify({'workspace': workspace_with_meta(db, workspace_id)}), 201
