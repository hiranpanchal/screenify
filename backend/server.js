require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const settingsRoutes = require('./routes/settings');
const schedulesRoutes = require('./routes/schedules');
const slideshowRoutes = require('./routes/slideshow');
const automationsRoutes = require('./routes/automations');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: serve uploaded files ────────────────────────────
const { UPLOADS_DIR } = require('./config/paths');
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/slideshow', slideshowRoutes);
app.use('/api/automations', automationsRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Serve frontend (production) ──────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Screenifi running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Uploads served at http://0.0.0.0:${PORT}/uploads`);

  // Start football automation after DB is initialised
  const { getDb } = require('./db/database');
  const automation = require('./services/automationManager');
  automation.init(getDb());
});
