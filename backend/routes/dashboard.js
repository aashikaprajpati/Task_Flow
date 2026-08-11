const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const userId = req.user.id;

  const projects = db
    .prepare(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.projectId = p.id
       WHERE p.ownerId = ? OR pm.userId = ?
       ORDER BY p.createdAt DESC`
    )
    .all(userId, userId);

  const projectSummaries = projects.map((p) => {
    const counts = db
      .prepare(`SELECT status, COUNT(*) as count FROM tasks WHERE projectId = ? GROUP BY status`)
      .all(p.id);
    const c = { todo: 0, 'in-progress': 0, done: 0 };
    counts.forEach((r) => { c[r.status] = r.count; });
    const total = c.todo + c['in-progress'] + c.done;
    const memberCount = db.prepare('SELECT COUNT(*) as n FROM project_members WHERE projectId = ?').get(p.id).n;
    return { id: p.id, title: p.title, description: p.description, createdAt: p.createdAt, taskCounts: c, totalTasks: total, memberCount };
  });

  const myTasks = db
    .prepare(
      `SELECT t.*, p.title as projectTitle FROM tasks t
       JOIN projects p ON p.id = t.projectId
       WHERE t.assigneeId = ? ORDER BY t.dueDate IS NULL, t.dueDate ASC LIMIT 8`
    )
    .all(userId);

  const totals = {
    totalProjects: projects.length,
    totalTasks: projectSummaries.reduce((s, p) => s + p.totalTasks, 0),
    todo: projectSummaries.reduce((s, p) => s + p.taskCounts.todo, 0),
    inProgress: projectSummaries.reduce((s, p) => s + p.taskCounts['in-progress'], 0),
    done: projectSummaries.reduce((s, p) => s + p.taskCounts.done, 0),
    myOpenTasks: myTasks.filter((t) => t.status !== 'done').length,
  };

  res.json({ totals, projects: projectSummaries, myTasks });
});

module.exports = router;
