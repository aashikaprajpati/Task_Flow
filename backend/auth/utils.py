import os
import jwt
import bcrypt
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, g


def hash_password(plain):
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def check_password(plain, hashed):
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def sign_token(user):
    secret = os.environ.get('JWT_SECRET')
    days = int(os.environ.get('JWT_EXPIRES_DAYS', '7'))
    payload = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(days=days),
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def error_response(status_code, message, field=None):
    return jsonify({'errors': [{'field': field, 'message': message}]}), status_code


def require_auth(fn):
    """Mirrors the Node middleware: verifies the Bearer token and attaches
    the decoded payload to g.user, or returns 401."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get('Authorization', '')
        token = header[7:] if header.startswith('Bearer ') else None
        if not token:
            return error_response(401, 'Authentication required. Please log in.')
        try:
            secret = os.environ.get('JWT_SECRET')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            g.user = payload
        except jwt.PyJWTError:
            return error_response(401, 'Your session has expired. Please log in again.')
        return fn(*args, **kwargs)
    return wrapper
