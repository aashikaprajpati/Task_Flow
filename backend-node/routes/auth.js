const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db/db');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be at least 8 characters.'),
];

router.post('/register', registerRules, handleValidation, (req, res) => {
  const { name, email, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(422).json({ errors: [{ field: 'email', message: 'An account with this email already exists.' }] });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hash, 'member');

  const user = db.prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ user, token });
});

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/login', loginRules, handleValidation, (req, res) => {
  const { email, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!row || !bcrypt.compareSync(password, row.password)) {
    return res.status(401).json({ errors: [{ field: null, message: 'Invalid email or password.' }] });
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.createdAt };
  const token = signToken(user);

  res.json({ user, token });
});

// Stateless JWT: logout is handled client-side by discarding the token.
// This endpoint exists for a consistent API surface and future blacklisting.
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out.' });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ errors: [{ field: null, message: 'User not found.' }] });
  res.json({ user });
});

// Used by member-add UI to search existing users by email/name
router.get('/users', requireAuth, (req, res) => {
  const q = `%${(req.query.q || '').toString().trim()}%`;
  const rows = db
    .prepare('SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10')
    .all(q, q);
  res.json({ users: rows });
});

module.exports = router;
