const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db/db');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

function hasProjectAccess(projectId, userId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return null;
  if (project.ownerId === userId) return project;
  const isMember = db
    .prepare('SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?')
    .get(projectId, userId);
  return isMember ? project : null;
}

function withAssignee(task) {
  if (!task) return task;
  const assignee = task.assigneeId
    ? db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(task.assigneeId)
    : null;
  return { ...task, assignee };
}

// List tasks for a project, e.g. GET /api/tasks?projectId=3
router.get('/', query('projectId').isInt().withMessage('projectId is required.'), handleValidation, (req, res) => {
  const project = hasProjectAccess(req.query.projectId, req.user.id);
  if (!project) return res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });

  const rows = db
    .prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY status, position ASC, createdAt DESC')
    .all(req.query.projectId);

  res.json({ tasks: rows.map(withAssignee) });
});

function dueDateValidator(value) {
  if (!value) return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Due date must be a valid date.');
  return true;
}

const taskRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 3, max: 120 }).withMessage('Title must be between 3 and 120 characters.'),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 1000 }).withMessage('Description must be under 1000 characters.'),
  body('status')
    .optional()
    .isIn(STATUSES).withMessage('Status must be todo, in-progress, or done.'),
  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage('Priority must be low, medium, or high.'),
  body('dueDate')
    .optional({ checkFalsy: true })
    .custom(dueDateValidator),
  body('assigneeId')
    .optional({ checkFalsy: true })
    .isInt().withMessage('Invalid assignee.'),
  body('projectId')
    .isInt().withMessage('A project is required.'),
];

router.post('/', taskRules, handleValidation, (req, res) => {
  const project = hasProjectAccess(req.body.projectId, req.user.id);
  if (!project) return res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });

  if (req.body.assigneeId) {
    const isAssigneeMember = db
      .prepare('SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?')
      .get(req.body.projectId, req.body.assigneeId);
    if (!isAssigneeMember) {
      return res.status(422).json({ errors: [{ field: 'assigneeId', message: 'Assignee must be a project member.' }] });
    }
  }

  const { title, description = '', status = 'todo', priority = 'medium', dueDate = null, assigneeId = null, projectId } = req.body;

  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) as m FROM tasks WHERE projectId = ? AND status = ?')
    .get(projectId, status).m;

  const info = db
    .prepare(
      `INSERT INTO tasks (title, description, status, priority, assigneeId, dueDate, projectId, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title, description, status, priority, assigneeId, dueDate, projectId, maxPos + 1);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ task: withAssignee(task) });
});

router.put(
  '/:id',
  [param('id').isInt().withMessage('Invalid task id.'), ...taskRules],
  handleValidation,
  (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ errors: [{ field: null, message: 'Task not found.' }] });

    const project = hasProjectAccess(existing.projectId, req.user.id);
    if (!project) return res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });

    const { title, description = '', status = existing.status, priority = existing.priority, dueDate = null, assigneeId = null } = req.body;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigneeId = ?, dueDate = ?, updatedAt = datetime('now')
       WHERE id = ?`
    ).run(title, description, status, priority, assigneeId, dueDate, req.params.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({ task: withAssignee(task) });
  }
);

// Lightweight endpoint for drag-and-drop: update status + position only
const moveRules = [
  param('id').isInt().withMessage('Invalid task id.'),
  body('status').isIn(STATUSES).withMessage('Status must be todo, in-progress, or done.'),
  body('position').isInt({ min: 0 }).withMessage('Position must be a non-negative integer.'),
];

router.patch('/:id/move', moveRules, handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ errors: [{ field: null, message: 'Task not found.' }] });

  const project = hasProjectAccess(existing.projectId, req.user.id);
  if (!project) return res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });

  const { status, position } = req.body;

  const move = db.transaction(() => {
    // Shift tasks in the destination column to make room
    db.prepare(
      `UPDATE tasks SET position = position + 1 WHERE projectId = ? AND status = ? AND position >= ? AND id != ?`
    ).run(existing.projectId, status, position, existing.id);

    db.prepare(`UPDATE tasks SET status = ?, position = ?, updatedAt = datetime('now') WHERE id = ?`).run(
      status,
      position,
      existing.id
    );
  });
  move();

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ task: withAssignee(task) });
});

router.delete('/:id', param('id').isInt().withMessage('Invalid task id.'), handleValidation, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ errors: [{ field: null, message: 'Task not found.' }] });

  const project = hasProjectAccess(existing.projectId, req.user.id);
  if (!project) return res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted.' });
});

module.exports = router;
