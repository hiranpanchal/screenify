const express = require('express');
const { getDb } = require('../db/database');

const router = express.Router();

// GET /api/slideshow/current
// Public endpoint — used by display screens to get the current playlist
router.get('/current', (req, res) => {
  const db = getDb();

  // Get global settings
  const settingRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingRows.forEach(({ key, value }) => {
    try { settings[key] = JSON.parse(value); }
    catch { settings[key] = value; }
  });

  // Determine current time to check schedules
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDay = now.getDay(); // 0=Sun, 6=Sat

  // Find a matching active schedule
  const schedules = db.prepare('SELECT * FROM schedules WHERE is_active = 1').all().map(row => ({
    ...row,
    media_ids: JSON.parse(row.media_ids || '[]'),
    days: JSON.parse(row.days || '[0,1,2,3,4,5,6]'),
  }));

  let activeSchedule = null;
  for (const schedule of schedules) {
    const inTimeRange = currentTime >= schedule.start_time && currentTime <= schedule.end_time;
    const inDayRange = schedule.days.includes(currentDay);
    if (inTimeRange && inDayRange && schedule.media_ids.length > 0) {
      activeSchedule = schedule;
      break;
    }
  }

  let media = [];
  let config = {};

  if (activeSchedule) {
    // Use scheduled media in the defined order
    const allMedia = db.prepare('SELECT * FROM media').all();
    const mediaMap = Object.fromEntries(allMedia.map(m => [m.id, m]));
    media = activeSchedule.media_ids.map(id => mediaMap[id]).filter(Boolean);
    config = {
      transition: activeSchedule.transition || settings.transition || 'fade',
      slide_duration: activeSchedule.slide_duration || Number(settings.default_duration) || 8,
      transition_speed: Number(settings.transition_speed) || 800,
      shuffle: false,
      loop: true,
      schedule_name: activeSchedule.name,
    };
  } else {
    // Use all media in default order
    media = db.prepare('SELECT * FROM media ORDER BY sort_order ASC, created_at ASC').all();

    if (settings.shuffle === true || settings.shuffle === 'true') {
      media = media.sort(() => Math.random() - 0.5);
    }

    config = {
      transition: settings.transition || 'fade',
      slide_duration: Number(settings.default_duration) || 8,
      transition_speed: Number(settings.transition_speed) || 800,
      shuffle: settings.shuffle === true || settings.shuffle === 'true',
      loop: settings.loop !== false && settings.loop !== 'false',
      show_progress: settings.show_progress !== false && settings.show_progress !== 'false',
      schedule_name: null,
    };
  }

  res.json({ media, config, timestamp: Date.now() });
});

module.exports = router;
