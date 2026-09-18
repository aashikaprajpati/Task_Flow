from flask import Blueprint, jsonify, g
from db.database import get_db, rows_to_list, row_to_dict
from auth.utils import require_auth, error_response

bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


def create_notification(db, user_id, actor_id, title, message, task_id=None, project_id=None):
    """Utility to create a notification if user_id != actor_id."""
    if not user_id or user_id == actor_id:
        return None
    cur = db.execute(
        """INSERT INTO notifications (userId, actorId, taskId, projectId, title, message)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, actor_id, task_id, project_id, title, message),
    )
    return cur.lastrowid


@bp.get('')
@require_auth
def get_notifications():
    db = get_db()
    user_id = g.user['id']

    rows = db.execute(
        """SELECT n.*, u.name as actorName, u.email as actorEmail,
                  t.title as taskTitle, p.title as projectTitle
           FROM notifications n
           LEFT JOIN users u ON u.id = n.actorId
           LEFT JOIN tasks t ON t.id = n.taskId
           LEFT JOIN projects p ON p.id = n.projectId
           WHERE n.userId = ?
           ORDER BY n.createdAt DESC LIMIT 50""",
        (user_id,),
    ).fetchall()

    unread_count = db.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0',
        (user_id,),
    ).fetchone()['count']

    return jsonify({
        'notifications': rows_to_list(rows),
        'unreadCount': unread_count,
    })


@bp.put('/<int:notification_id>/read')
@require_auth
def mark_read(notification_id):
    db = get_db()
    user_id = g.user['id']

    notif = db.execute(
        'SELECT * FROM notifications WHERE id = ? AND userId = ?',
        (notification_id, user_id),
    ).fetchone()

    if not notif:
        return error_response(404, 'Notification not found.')

    db.execute('UPDATE notifications SET isRead = 1 WHERE id = ?', (notification_id,))
    db.commit()

    updated = db.execute('SELECT * FROM notifications WHERE id = ?', (notification_id,)).fetchone()
    return jsonify({'notification': row_to_dict(updated)})


@bp.put('/read-all')
@require_auth
def mark_all_read():
    db = get_db()
    user_id = g.user['id']

    db.execute('UPDATE notifications SET isRead = 1 WHERE userId = ?', (user_id,))
    db.commit()

    return jsonify({'message': 'All notifications marked as read.'})
