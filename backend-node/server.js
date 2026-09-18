require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db/db'); // ensures schema is applied on boot

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ errors: [{ field: null, message: 'Not found.' }] });
});

// Central error handler (catches thrown/unexpected errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ errors: [{ field: null, message: 'Something went wrong on the server.' }] });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TaskFlow API listening on http://localhost:${PORT}`);
});
