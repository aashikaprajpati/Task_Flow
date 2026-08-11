const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errors: [{ field: null, message: 'Authentication required. Please log in.' }] });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, name, role }
    next();
  } catch (err) {
    return res.status(401).json({ errors: [{ field: null, message: 'Your session has expired. Please log in again.' }] });
  }
}

module.exports = { requireAuth };
