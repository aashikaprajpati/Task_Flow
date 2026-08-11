const express = require('express');
const { body, param } = require('express-validator');
const db = require('../db/db');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function projectWithMeta(projectId, userId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return null;

  const owner = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(project.ownerId);
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.email FROM project_members pm
       JOIN users u ON u.id = pm.userId WHERE pm.projectId = ?`
    )
    .all(projectId);
  const taskCounts = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM tasks WHERE projectId = ? GROUP BY status`
    )
    .all(projectId);

  const counts = { todo: 0, 'in-progress': 0, done: 0 };
  taskCounts.forEach((r) => { counts[r.status] = r.count; });
  const total = counts.todo + counts['in-progress'] + counts.done;

  return { ...project, owner, members, taskCounts: counts, totalTasks: total };
}

function assertAccess(req, res, projectId) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    res.status(404).json({ errors: [{ field: null, message: 'Project not found.' }] });
    return null;
  }
  const isMember = db
    .prepare('SELECT 1 FROM project_members WHERE projectId = ? AND userId = ?')
    .get(projectId, req.user.id);
  if (project.ownerId !== req.user.id && !isMember) {
    res.status(403).json({ errors: [{ field: null, message: "You don't have access to this project." }] });
    return null;
  }
  return project;
}

// List all projects the user owns or is a member of
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.projectId = p.id
       WHERE p.ownerId = ? OR pm.userId = ?
       ORDER BY p.createdAt DESC`
    )
    .all(req.user.id, req.user.id);

  const projects = rows.map((p) => projectWithMeta(p.id, req.user.id));
  res.json({ projects });
});

const projectRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 3, max: 80 }).withMessage('Title must be between 3 and 80 characters.'),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 }).withMessage('Description must be under 500 characters.'),
];

router.post('/', projectRules, handleValidation, (req, res) => {
  const { title, description = '' } = req.body;
  const info = db
    .prepare('INSERT INTO projects (title, description, ownerId) VALUES (?, ?, ?)')
    .run(title, description, req.user.id);
  db.prepare('INSERT INTO project_members (projectId, userId) VALUES (?, ?)').run(info.lastInsertRowid, req.user.id);

  res.status(201).json({ project: projectWithMeta(info.lastInsertRowid, req.user.id) });
});

router.get('/:id', param('id').isInt().withMessage('Invalid project id.'), handleValidation, (req, res) => {
  const project = assertAccess(req, res, req.params.id);
  if (!project) return;
  res.json({ project: projectWithMeta(project.id, req.user.id) });
});

router.put(
  '/:id',
  [param('id').isInt().withMessage('Invalid project id.'), ...projectRules],
  handleValidation,
  (req, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ errors: [{ field: null, message: 'Project not found.' }] });
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ errors: [{ field: null, message: 'Only the project owner can edit this project.' }] });
    }

    const { title, description = '' } = req.body;
    db.prepare('UPDATE projects SET title = ?, description = ? WHERE id = ?').run(title, description, req.params.id);
    res.json({ project: projectWithMeta(req.params.id, req.user.id) });
  }
);

router.delete('/:id', param('id').isInt().withMessage('Invalid project id.'), handleValidation, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ errors: [{ field: null, message: 'Project not found.' }] });
  if (project.ownerId !== req.user.id) {
    return res.status(403).json({ errors: [{ field: null, message: 'Only the project owner can delete this project.' }] });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted.' });
});

const memberRules = [
  param('id').isInt().withMessage('Invalid project id.'),
  body('userId').isInt().withMessage('A valid user must be selected.'),
];

router.post('/:id/members', memberRules, handleValidation, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ errors: [{ field: null, message: 'Project not found.' }] });
  if (project.ownerId !== req.user.id) {
    return res.status(403).json({ errors: [{ field: null, message: 'Only the project owner can add members.' }] });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.body.userId);
  if (!user) return res.status(422).json({ errors: [{ field: 'userId', message: 'That user does not exist.' }] });

  try {
    db.prepare('INSERT INTO project_members (projectId, userId) VALUES (?, ?)').run(req.params.id, req.body.userId);
  } catch {
    return res.status(422).json({ errors: [{ field: 'userId', message: 'That user is already a member.' }] });
  }
  res.status(201).json({ project: projectWithMeta(req.params.id, req.user.id) });
});

router.delete(
  '/:id/members/:userId',
  [param('id').isInt(), param('userId').isInt()],
  handleValidation,
  (req, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ errors: [{ field: null, message: 'Project not found.' }] });
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({ errors: [{ field: null, message: 'Only the project owner can remove members.' }] });
    }
    if (Number(req.params.userId) === project.ownerId) {
      return res.status(422).json({ errors: [{ field: null, message: 'The project owner cannot be removed.' }] });
    }
    db.prepare('DELETE FROM project_members WHERE projectId = ? AND userId = ?').run(req.params.id, req.params.userId);
    res.json({ project: projectWithMeta(req.params.id, req.user.id) });
  }
);

module.exports = router;
