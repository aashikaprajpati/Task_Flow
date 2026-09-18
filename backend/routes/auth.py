from flask import Blueprint, request, jsonify, g
from db.database import get_db, row_to_dict, rows_to_list
from auth.utils import hash_password, check_password, sign_token, require_auth, error_response
from auth.validation import ValidationErrors, require_str, require_email, optional_enum

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
COMPANY_TYPES = ['agency', 'tech', 'financial', 'consulting', 'production', 'other']


@bp.post('/register')
def register():
    data = request.get_json(silent=True) or {}
    try:
        name = require_str(data, 'name', 'Name', 2, 60)
        email = require_email(data)
        password = data.get('password') or ''
        if not password:
            raise ValidationErrors([{'field': 'password', 'message': 'Password is required.'}])
        if len(password) < 8 or len(password) > 72:
            raise ValidationErrors([{'field': 'password', 'message': 'Password must be at least 8 characters.'}])
        company_type = optional_enum(data, 'companyType', 'Company type', COMPANY_TYPES, default='') or ''
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return error_response(422, 'An account with this email already exists.', 'email')

    password_hash = hash_password(password)
    cur = db.execute(
        'INSERT INTO users (name, email, password, companyType, role) VALUES (?, ?, ?, ?, ?)',
        (name, email, password_hash, company_type, 'member'),
    )
    db.commit()
    user_row = db.execute(
        'SELECT id, name, email, companyType, role, createdAt FROM users WHERE id = ?', (cur.lastrowid,)
    ).fetchone()
    user = row_to_dict(user_row)
    token = sign_token(user)
    return jsonify({'user': user, 'token': token}), 201


@bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    try:
        email = require_email(data)
        password = data.get('password') or ''
        if not password:
            raise ValidationErrors([{'field': 'password', 'message': 'Password is required.'}])
    except ValidationErrors as e:
        return jsonify({'errors': e.errors}), 422

    db = get_db()
    row = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not row or not check_password(password, row['password']):
        return error_response(401, 'Invalid email or password.')

    user = {'id': row['id'], 'name': row['name'], 'email': row['email'], 'companyType': row['companyType'], 'role': row['role'], 'createdAt': row['createdAt']}
    token = sign_token(user)
    return jsonify({'user': user, 'token': token})


@bp.post('/google')
def google_auth():
    import secrets
    import jwt

    data = request.get_json(silent=True) or {}
    credential = data.get('credential')
    email = data.get('email')
    name = data.get('name')
    company_type = data.get('companyType') or ''
    if company_type not in COMPANY_TYPES:
        company_type = ''

    # If Google ID Token is provided by Google Identity Services, decode it
    if credential:
        try:
            payload = jwt.decode(credential, options={'verify_signature': False})
            email = payload.get('email')
            name = payload.get('name') or payload.get('given_name') or email.split('@')[0]
        except Exception:
            pass

    if not email:
        return error_response(422, 'A valid Google email is required.', 'email')

    email = email.lower().strip()
    name = (name or email.split('@')[0]).strip()

    db = get_db()
    row = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    if not row:
        # Create user account automatically
        random_password = hash_password(secrets.token_urlsafe(24))
        cur = db.execute(
            'INSERT INTO users (name, email, password, companyType, role) VALUES (?, ?, ?, ?, ?)',
            (name, email, random_password, company_type, 'member'),
        )
        db.commit()
        row = db.execute('SELECT * FROM users WHERE id = ?', (cur.lastrowid,)).fetchone()

    user = {'id': row['id'], 'name': row['name'], 'email': row['email'], 'companyType': row['companyType'], 'role': row['role'], 'createdAt': row['createdAt']}
    token = sign_token(user)
    return jsonify({'user': user, 'token': token})


@bp.post('/logout')
@require_auth
def logout():
    # Stateless JWT: logout is handled client-side by discarding the token.
    return jsonify({'message': 'Logged out.'})


@bp.get('/me')
@require_auth
def me():
    db = get_db()
    row = db.execute('SELECT id, name, email, companyType, role, createdAt FROM users WHERE id = ?', (g.user['id'],)).fetchone()
    if not row:
        return error_response(404, 'User not found.')
    return jsonify({'user': row_to_dict(row)})


@bp.get('/users')
@require_auth
def search_users():
    q = f"%{request.args.get('q', '').strip()}%"
    db = get_db()
    rows = db.execute(
        'SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10', (q, q)
    ).fetchall()
    return jsonify({'users': rows_to_list(rows)})
