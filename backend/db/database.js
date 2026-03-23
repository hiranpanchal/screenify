const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'screenify.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image','video')),
      duration INTEGER DEFAULT 8,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      media_ids TEXT NOT NULL DEFAULT '[]',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
      transition TEXT DEFAULT 'fade',
      slide_duration INTEGER DEFAULT 8,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add source column to media if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE media ADD COLUMN source TEXT DEFAULT 'manual'`);
  } catch (e) { /* column already exists */ }

  // Add mimetype column if missing (older DBs may lack it)
  try {
    db.exec(`ALTER TABLE media ADD COLUMN mimetype TEXT DEFAULT 'image/jpeg'`);
  } catch (e) { /* already exists */ }

  // Insert default settings if they don't exist
  const { SPORTS_CONFIG } = require('../services/sportsService');

  const defaults = {
    default_duration: '8',
    transition: 'fade',
    transition_speed: '800',
    shuffle: 'false',
    loop: 'true',
    show_progress: 'true',
    // Shared automation settings
    automation_bar_logo: '',
    automation_active_media_id: '',
    automation_active_game_key: '',
    automation_active_sport: '',
  };

  // Seed per-sport defaults
  for (const sport of SPORTS_CONFIG) {
    defaults[`sport_${sport.key}_enabled`]    = '0';
    defaults[`sport_${sport.key}_promo_text`] = sport.defaultPromo;
  }

  const insertSetting = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
  );
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  // Create default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('✅ Default admin user created: admin / admin123');
  }
}

module.exports = { getDb };
