from flask import Blueprint, jsonify, g
from db.database import get_db, rows_to_list
from auth.utils import require_auth

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@bp.get('')
@require_auth
def get_dashboard():
    db = get_db()
    user_id = g.user['id']

    projects = db.execute(
        """SELECT DISTINCT p.* FROM projects p
           LEFT JOIN project_members pm ON pm.projectId = p.id
           WHERE p.ownerId = ? OR pm.userId = ?
           ORDER BY p.createdAt DESC""",
        (user_id, user_id),
    ).fetchall()

    project_summaries = []
    for p in projects:
        counts_rows = db.execute(
            'SELECT status, COUNT(*) as count FROM tasks WHERE projectId = ? GROUP BY status', (p['id'],)
        ).fetchall()
        c = {'todo': 0, 'in-progress': 0, 'done': 0}
        for r in counts_rows:
            c[r['status']] = r['count']
        total = sum(c.values())
        member_count = db.execute(
            'SELECT COUNT(*) as n FROM project_members WHERE projectId = ?', (p['id'],)
        ).fetchone()['n']
        project_summaries.append({
            'id': p['id'], 'title': p['title'], 'description': p['description'], 'createdAt': p['createdAt'],
            'taskCounts': c, 'totalTasks': total, 'memberCount': member_count,
        })

    my_tasks_rows = db.execute(
        """SELECT t.*, p.title as projectTitle FROM tasks t
           JOIN projects p ON p.id = t.projectId
           WHERE t.assigneeId = ? ORDER BY t.dueDate IS NULL, t.dueDate ASC LIMIT 8""",
        (user_id,),
    ).fetchall()
    my_tasks = rows_to_list(my_tasks_rows)

    totals = {
        'totalProjects': len(projects),
        'totalTasks': sum(p['totalTasks'] for p in project_summaries),
        'todo': sum(p['taskCounts']['todo'] for p in project_summaries),
        'inProgress': sum(p['taskCounts']['in-progress'] for p in project_summaries),
        'done': sum(p['taskCounts']['done'] for p in project_summaries),
        'myOpenTasks': len([t for t in my_tasks if t['status'] != 'done']),
    }

    return jsonify({'totals': totals, 'projects': project_summaries, 'myTasks': my_tasks})
