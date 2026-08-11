// Standalone migration runner: `npm run migrate`
// Safe to re-run - all statements in schema.sql use IF NOT EXISTS.
const db = require('./db');
console.log('Schema applied successfully to', db.name);
process.exit(0);
