const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const { UPLOADS_DIR } = require('../config/paths');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /image\/(jpeg|jpg|png|gif|webp|bmp)|video\/(mp4|webm|ogg|mov|avi)/;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// GET /api/media — list all media
router.get('/', (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media ORDER BY sort_order ASC, created_at ASC').all();
  res.json(media);
});

// POST /api/media/upload — upload one or more files
router.post('/upload', requireAuth, upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const db = getDb();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM media').get().m || 0;

  const inserted = [];
  req.files.forEach((file, i) => {
    const isVideo = file.mimetype.startsWith('video/');
    const id = path.parse(file.filename).name;

    db.prepare(`
      INSERT INTO media (id, filename, original_name, mimetype, size, type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, file.filename, file.originalname, file.mimetype, file.size, isVideo ? 'video' : 'image', maxOrder + i + 1);

    inserted.push({
      id,
      filename: file.filename,
      original_name: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: isVideo ? 'video' : 'image',
    });
  });

  res.json({ uploaded: inserted });
});

// DELETE /api/media/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const filePath = path.join(UPLOADS_DIR, item.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

// PUT /api/media/:id — update duration or name
router.put('/:id', requireAuth, (req, res) => {
  const { duration, original_name } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE media SET
      duration = COALESCE(?, duration),
      original_name = COALESCE(?, original_name)
    WHERE id = ?
  `).run(duration ?? null, original_name ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id));
});

// PUT /api/media/reorder — update sort order
router.put('/reorder/bulk', requireAuth, (req, res) => {
  const { order } = req.body; // array of ids in new order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of ids' });

  const db = getDb();
  const update = db.prepare('UPDATE media SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    order.forEach((id, index) => update.run(index, id));
  });
  tx();

  res.json({ message: 'Reordered' });
});

module.exports = router;
