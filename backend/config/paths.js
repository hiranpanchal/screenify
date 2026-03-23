/**
 * paths.js
 * Central config for all file-system paths.
 *
 * On Railway: set DATA_DIR=/app/data and mount a Volume at /app/data.
 * That volume persists across deploys so uploads and the DB survive.
 *
 * In local dev: falls back to backend/ directory (existing behaviour).
 */

const path = require('path');
const fs   = require('fs');

// Railway: set env var DATA_DIR=/app/data  +  mount Volume at /app/data
// Local dev: no env var → use backend/ folder as before
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, '..');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH     = path.join(DATA_DIR, 'screenify.db');

// Ensure uploads directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = { DATA_DIR, UPLOADS_DIR, DB_PATH };
