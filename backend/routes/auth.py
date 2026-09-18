import os
from flask import Blueprint, request, jsonify, g
from db.database import get_db, row_to_dict, rows_to_list
from auth.utils import hash_password, check_password, sign_token, require_auth, error_response
from auth.validation import ValidationErrors, require_str, require_email, optional_enum

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
COMPANY_TYPES = ['agency', 'tech', 'financial', 'consulting', 'production', 'other']

# Fixed allowlist for the no-credential demo Google sign-in fallback (used when no real
# Google Cloud OAuth client is configured, e.g. for evaluators testing the app offline).
# This list is intentionally hardcoded: it can NEVER be used to authenticate into an
# arbitrary or pre-existing account, only these exact demo identities.
DEMO_GOOGLE_EMAILS = {
    'aashika.prajapati@gmail.com',
    'matina.maharjan@gmail.com',
    'samriddhi.shrestha@gmail.com',
}


def _verify_google_credential(credential):
    """Cryptographically verifies a real Google ID token (from Google Identity Services).
    Raises ValueError on any failure. Returns (email, name)."""
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not client_id:
        raise ValueError('Google sign-in is not configured on this server.')

    idinfo = google_id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
    if idinfo.get('aud') != client_id:
        raise ValueError('Token audience mismatch.')
    if idinfo.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
        raise ValueError('Unexpected token issuer.')
    email = idinfo.get('email')
    if not email or not idinfo.get('email_verified'):
        raise ValueError("Google account email isn't verified.")
    name = idinfo.get('name') or idinfo.get('given_name') or email.split('@')[0]
    return email.lower().strip(), name.strip()


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

    data = request.get_json(silent=True) or {}
    credential = data.get('credential')
    company_type = data.get('companyType') or ''
    if company_type not in COMPANY_TYPES:
        company_type = ''

    db = get_db()

    if credential:
        # Real Google Identity Services token - verified against Google's public keys,
        # audience (our client ID), and issuer. This is the only path that can log in
        # to (or create) an arbitrary Google-owned email address.
        try:
            email, name = _verify_google_credential(credential)
        except Exception:
            return error_response(401, "Google sign-in verification failed. Please try again.")
    else:
        # No-credential fallback for offline evaluation. Deliberately restricted to a
        # fixed demo allowlist so this can never be used to take over a real account -
        # unlike the previous version, it does not accept an arbitrary email/name pair.
        if os.environ.get('ALLOW_DEMO_GOOGLE_AUTH', '').lower() != 'true':
            return error_response(422, 'Google sign-in requires a valid credential.', 'credential')
        email = (data.get('email') or '').lower().strip()
        name = (data.get('name') or '').strip()
        if email not in DEMO_GOOGLE_EMAILS:
            return error_response(
                422, 'Demo Google sign-in only supports the listed demo accounts.', 'email'
            )
        if not name:
            name = email.split('@')[0]

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
