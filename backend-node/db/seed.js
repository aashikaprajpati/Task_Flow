// Demo data seed script: `npm run seed`
// Creates 3 demo users, 2 projects with members, and a spread of tasks
// across all statuses/priorities so the Kanban board looks alive for grading.
const bcrypt = require('bcryptjs');
const db = require('./db');

const clear = db.transaction(() => {
  db.exec('DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('tasks','projects','users');");
});

const run = db.transaction(() => {
  clear();

  const hash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );
  const alice = insertUser.run('Alice Sharma', 'alice@taskflow.dev', hash, 'admin');
  const bob = insertUser.run('Bob Thapa', 'bob@taskflow.dev', hash, 'member');
  const chloe = insertUser.run('Chloe Gurung', 'chloe@taskflow.dev', hash, 'member');

  const aliceId = alice.lastInsertRowid;
  const bobId = bob.lastInsertRowid;
  const chloeId = chloe.lastInsertRowid;

  const insertProject = db.prepare(
    'INSERT INTO projects (title, description, ownerId) VALUES (?, ?, ?)'
  );
  const p1 = insertProject.run(
    'TaskFlow Redesign',
    'Ship the new Kanban-first UI and REST API for the spring release.',
    aliceId
  );
  const p2 = insertProject.run(
    'Mobile App Beta',
    'Plan and build the first beta of the companion mobile app.',
    bobId
  );

  const p1Id = p1.lastInsertRowid;
  const p2Id = p2.lastInsertRowid;

  const insertMember = db.prepare(
    'INSERT INTO project_members (projectId, userId) VALUES (?, ?)'
  );
  [[p1Id, aliceId], [p1Id, bobId], [p1Id, chloeId], [p2Id, bobId], [p2Id, chloeId]].forEach(
    ([pid, uid]) => insertMember.run(pid, uid)
  );

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigneeId, dueDate, projectId, position)
    VALUES (@title, @description, @status, @priority, @assigneeId, @dueDate, @projectId, @position)
  `);

  const tasks = [
    { title: 'Design Kanban board layout', description: 'Column structure, card anatomy, drag states.', status: 'done', priority: 'high', assigneeId: aliceId, dueDate: '2026-07-10', projectId: p1Id, position: 0 },
    { title: 'Set up Express + SQLite backend', description: 'Schema, auth routes, validation middleware.', status: 'done', priority: 'high', assigneeId: bobId, dueDate: '2026-07-12', projectId: p1Id, position: 1 },
    { title: 'Build JWT auth flow', description: 'Register, login, protected routes, refresh handling.', status: 'in-progress', priority: 'high', assigneeId: aliceId, dueDate: '2026-08-18', projectId: p1Id, position: 0 },
    { title: 'Implement drag-and-drop', description: 'Cross-column drag with optimistic UI updates.', status: 'in-progress', priority: 'medium', assigneeId: chloeId, dueDate: '2026-08-20', projectId: p1Id, position: 1 },
    { title: 'Write form validation rules', description: 'Mirror zod schemas server-side with express-validator.', status: 'todo', priority: 'medium', assigneeId: bobId, dueDate: '2026-08-25', projectId: p1Id, position: 0 },
    { title: 'Add project member management', description: 'Add/remove members, owner-only permissions.', status: 'todo', priority: 'low', assigneeId: chloeId, dueDate: '2026-08-28', projectId: p1Id, position: 1 },
    { title: 'Dashboard task-count widgets', description: 'Per-project counts by status for the overview page.', status: 'todo', priority: 'low', assigneeId: null, dueDate: null, projectId: p1Id, position: 2 },

    { title: 'Wireframe onboarding flow', description: 'First-run experience for new mobile users.', status: 'todo', priority: 'medium', assigneeId: chloeId, dueDate: '2026-09-01', projectId: p2Id, position: 0 },
    { title: 'Evaluate push notification providers', description: 'Compare cost and delivery reliability.', status: 'todo', priority: 'low', assigneeId: bobId, dueDate: null, projectId: p2Id, position: 1 },
    { title: 'Spike: offline task caching', description: 'Prototype local cache with background sync.', status: 'in-progress', priority: 'high', assigneeId: bobId, dueDate: '2026-08-22', projectId: p2Id, position: 0 },
  ];

  tasks.forEach((t) => insertTask.run(t));
});

run();

console.log('Seed complete.');
console.log('Demo accounts (all use password: password123):');
console.log('  alice@taskflow.dev  (admin, owns "TaskFlow Redesign")');
console.log('  bob@taskflow.dev    (member, owns "Mobile App Beta")');
console.log('  chloe@taskflow.dev  (member)');
process.exit(0);
