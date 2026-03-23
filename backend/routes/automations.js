const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const auth     = require('../middleware/authMiddleware');
const { getDb } = require('../db/database');
const automation = require('../services/automationManager');

const router  = express.Router();
const upload  = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}
function setSetting(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

// GET /api/automations — return current config
router.get('/', auth, (req, res) => {
  const db = getDb();
  res.json({
    football_enabled:    getSetting(db, 'football_enabled') === '1',
    football_promo_text: getSetting(db, 'football_promo_text'),
    football_bar_logo:   getSetting(db, 'football_bar_logo'),
    football_active_media_id:  getSetting(db, 'football_active_media_id'),
    football_active_game_key:  getSetting(db, 'football_active_game_key'),
  });
});

// PUT /api/automations — update config
router.put('/', auth, (req, res) => {
  const db = getDb();
  const { football_enabled, football_promo_text } = req.body;

  if (football_enabled !== undefined) setSetting(db, 'football_enabled', football_enabled ? '1' : '0');
  if (football_promo_text !== undefined) setSetting(db, 'football_promo_text', football_promo_text);

  // Trigger an immediate re-check after config change
  automation.triggerNow().catch(console.error);

  res.json({ ok: true });
});

// POST /api/automations/bar-logo — upload bar logo
router.post('/bar-logo', auth, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const db = getDb();
  const old = getSetting(db, 'football_bar_logo');

  // Delete old logo
  if (old) {
    try { fs.unlinkSync(path.join(__dirname, '../uploads', old)); } catch { /* ok */ }
  }

  // Rename multer's temp file to keep the extension
  const ext      = path.extname(req.file.originalname) || '.png';
  const newName  = `bar_logo_${Date.now()}${ext}`;
  const newPath  = path.join(__dirname, '../uploads', newName);
  fs.renameSync(req.file.path, newPath);

  setSetting(db, 'football_bar_logo', newName);

  // Re-generate with new logo if automation is active
  automation.triggerNow().catch(console.error);

  res.json({ filename: newName });
});

// POST /api/automations/trigger — force an immediate check (useful for testing)
router.post('/trigger', auth, async (req, res) => {
  try {
    await automation.triggerNow();
    res.json({ ok: true, message: 'Check triggered' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/automations/fixtures — preview today's PL fixtures
router.get('/fixtures', auth, async (req, res) => {
  try {
    const { getTodaysPLGames } = require('../services/footballService');
    const games = await getTodaysPLGames();
    res.json(games.map(g => ({
      id: g.idEvent,
      home: g.strHomeTeam,
      away: g.strAwayTeam,
      time: g.strTime,
      date: g.dateEvent,
      status: g.strStatus,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
