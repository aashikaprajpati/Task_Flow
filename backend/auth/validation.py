import re

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


class ValidationErrors(Exception):
    """Raised (and caught by route handlers) to short-circuit with a 422
    response shaped exactly like the Node version: {"errors": [{"field","message"}]}."""

    def __init__(self, errors):
        self.errors = errors


def require_str(data, field, label, min_len=None, max_len=None):
    value = (data.get(field) or '').strip() if isinstance(data.get(field), str) else data.get(field)
    if value is None or value == '':
        raise ValidationErrors([{'field': field, 'message': f'{label} is required.'}])
    if min_len and len(value) < min_len:
        raise ValidationErrors([{'field': field, 'message': f'{label} must be between {min_len} and {max_len} characters.'}])
    if max_len and len(value) > max_len:
        raise ValidationErrors([{'field': field, 'message': f'{label} must be between {min_len} and {max_len} characters.'}])
    return value


def optional_str(data, field, label, max_len=None):
    value = data.get(field)
    if value is None:
        return ''
    value = value.strip() if isinstance(value, str) else value
    if value and max_len and len(value) > max_len:
        raise ValidationErrors([{'field': field, 'message': f'{label} must be under {max_len} characters.'}])
    return value or ''


def require_email(data, field='email'):
    value = (data.get(field) or '').strip()
    if not value:
        raise ValidationErrors([{'field': field, 'message': 'Email is required.'}])
    if not EMAIL_RE.match(value):
        raise ValidationErrors([{'field': field, 'message': 'Enter a valid email address.'}])
    return value.lower()


def require_enum(data, field, label, choices):
    value = data.get(field)
    if value not in choices:
        raise ValidationErrors([{'field': field, 'message': f'{label} must be {", ".join(choices)}.'}])
    return value


def optional_enum(data, field, label, choices, default=None):
    value = data.get(field)
    if value is None or value == '':
        return default
    if value not in choices:
        raise ValidationErrors([{'field': field, 'message': f'{label} must be {", ".join(choices)}.'}])
    return value


def require_int(data, field, label):
    value = data.get(field)
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationErrors([{'field': field, 'message': f'{label} must be a valid number.'}])


def optional_int(data, field, label):
    value = data.get(field)
    if value is None or value == '':
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationErrors([{'field': field, 'message': f'{label} must be a valid number.'}])


def validate_date_str(data, field='dueDate'):
    from datetime import datetime
    value = data.get(field)
    if not value:
        return None
    try:
        datetime.fromisoformat(value[:10])
        return value
    except ValueError:
        raise ValidationErrors([{'field': field, 'message': 'Due date must be a valid date.'}])
