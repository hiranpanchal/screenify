const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(({ key, value }) => {
    // Parse JSON values where applicable
    try { settings[key] = JSON.parse(value); }
    catch { settings[key] = value; }
  });
  res.json(settings);
});

// PUT /api/settings
router.put('/', requireAuth, (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const tx = db.transaction((updates) => {
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });

  tx(req.body);

  // Return updated settings
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(({ key, value }) => {
    try { settings[key] = JSON.parse(value); }
    catch { settings[key] = value; }
  });
  res.json(settings);
});

module.exports = router;
