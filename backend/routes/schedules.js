const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function parseSchedule(row) {
  if (!row) return null;
  return {
    ...row,
    media_ids: JSON.parse(row.media_ids || '[]'),
    days: JSON.parse(row.days || '[0,1,2,3,4,5,6]'),
    is_active: Boolean(row.is_active),
  };
}

// GET /api/schedules
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM schedules ORDER BY created_at ASC').all();
  res.json(rows.map(parseSchedule));
});

// POST /api/schedules
router.post('/', requireAuth, (req, res) => {
  const { name, media_ids = [], start_time, end_time, days = [0,1,2,3,4,5,6], transition, slide_duration, is_active = true } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time, and end_time are required' });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO schedules (id, name, media_ids, start_time, end_time, days, transition, slide_duration, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, name,
    JSON.stringify(media_ids),
    start_time, end_time,
    JSON.stringify(days),
    transition || 'fade',
    slide_duration || 8,
    is_active ? 1 : 0
  );

  const created = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  res.status(201).json(parseSchedule(created));
});

// PUT /api/schedules/:id
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const {
    name = existing.name,
    media_ids,
    start_time = existing.start_time,
    end_time = existing.end_time,
    days,
    transition = existing.transition,
    slide_duration = existing.slide_duration,
    is_active,
  } = req.body;

  db.prepare(`
    UPDATE schedules SET
      name = ?, media_ids = ?, start_time = ?, end_time = ?,
      days = ?, transition = ?, slide_duration = ?, is_active = ?
    WHERE id = ?
  `).run(
    name,
    JSON.stringify(media_ids !== undefined ? media_ids : JSON.parse(existing.media_ids)),
    start_time, end_time,
    JSON.stringify(days !== undefined ? days : JSON.parse(existing.days)),
    transition,
    slide_duration,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );

  res.json(parseSchedule(db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id)));
});

// DELETE /api/schedules/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
