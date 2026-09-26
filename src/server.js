require('dotenv').config();
const path = require('path');
const express = require('express');
const { connect } = require('./db');

const assetsRouter = require('./routes/assets');
const wardsRouter = require('./routes/wards');
const statsRouter = require('./routes/stats');
const insightsRouter = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- API ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/assets', assetsRouter);
app.use('/api/wards', wardsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/insights', insightsRouter);

// --- Frontend (static) ---
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

async function start() {
  await connect(); // fail fast if MONGODB_URI is wrong, rather than serving broken API routes
  app.listen(PORT, () => {
    console.log(`Pudukkottai Utility GIS API + frontend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
