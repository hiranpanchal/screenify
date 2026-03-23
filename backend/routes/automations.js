const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { requireAuth: auth } = require('../middleware/authMiddleware');
const { getDb }  = require('../db/database');
const automation = require('../services/automationManager');
const { SPORTS_CONFIG, getTodaysGames } = require('../services/sportsService');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : '';
}
function setSetting(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value ?? ''));
}

// GET /api/automations — full config for all sports
router.get('/', auth, (req, res) => {
  const db = getDb();
  const sports = SPORTS_CONFIG.map(s => ({
    key:       s.key,
    name:      s.name,
    emoji:     s.emoji,
    enabled:   getSetting(db, `sport_${s.key}_enabled`) === '1',
    promoText: getSetting(db, `sport_${s.key}_promo_text`) || s.defaultPromo,
  }));

  res.json({
    sports,
    barLogo:         getSetting(db, 'automation_bar_logo'),
    activeMediaId:   getSetting(db, 'automation_active_media_id'),
    activeSport:     getSetting(db, 'automation_active_sport'),
    activeGameKey:   getSetting(db, 'automation_active_game_key'),
  });
});

// PUT /api/automations/sport/:key — update a single sport's config
router.put('/sport/:key', auth, (req, res) => {
  const db    = getDb();
  const sport = SPORTS_CONFIG.find(s => s.key === req.params.key);
  if (!sport) return res.status(404).json({ error: 'Unknown sport' });

  const { enabled, promoText } = req.body;
  if (enabled  !== undefined) setSetting(db, `sport_${sport.key}_enabled`,    enabled ? '1' : '0');
  if (promoText !== undefined) setSetting(db, `sport_${sport.key}_promo_text`, promoText);

  automation.triggerNow().catch(console.error);
  res.json({ ok: true });
});

// POST /api/automations/bar-logo — upload shared bar logo
router.post('/bar-logo', auth, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const db  = getDb();
  const old = getSetting(db, 'automation_bar_logo');
  if (old) {
    try { fs.unlinkSync(path.join(__dirname, '../uploads', old)); } catch { /* ok */ }
  }
  const ext     = path.extname(req.file.originalname) || '.png';
  const newName = `bar_logo_${Date.now()}${ext}`;
  fs.renameSync(req.file.path, path.join(__dirname, '../uploads', newName));
  setSetting(db, 'automation_bar_logo', newName);
  automation.triggerNow().catch(console.error);
  res.json({ filename: newName });
});

// POST /api/automations/trigger — force immediate check
router.post('/trigger', auth, async (req, res) => {
  try {
    await automation.triggerNow();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/automations/fixtures/:key — today's games for a sport
router.get('/fixtures/:key', auth, async (req, res) => {
  const sport = SPORTS_CONFIG.find(s => s.key === req.params.key);
  if (!sport) return res.status(404).json({ error: 'Unknown sport' });
  try {
    const games = await getTodaysGames(sport.league);
    res.json(games.map(g => ({
      id:     g.idEvent,
      home:   g.strHomeTeam,
      away:   g.strAwayTeam,
      time:   g.strTime,
      date:   g.dateEvent,
      status: g.strStatus,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
