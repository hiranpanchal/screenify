/**
 * paths.js
 * Central config for all persistent file-system paths.
 *
 * Railway: mount a Volume at /app/data in the Railway dashboard.
 *   No env var needed — Railway is auto-detected via RAILWAY_ENVIRONMENT.
 *
 * Local dev: falls back to backend/ directory (no change from before).
 */

const path = require('path');
const fs   = require('fs');

// Railway injects RAILWAY_ENVIRONMENT automatically on all deployments.
// If that var exists we know we're on Railway and use /app/data (the volume mount).
// DATA_DIR env var can still override both if needed.
const ON_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT;
const DATA_DIR   = process.env.DATA_DIR
  || (ON_RAILWAY ? '/app/data' : path.join(__dirname, '..'));

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH     = path.join(DATA_DIR, 'screenify.db');

// Log once at startup so you can confirm the path in Railway's deploy logs
console.log(`[paths] storage: ${DATA_DIR} (${ON_RAILWAY ? 'Railway — volume required at /app/data' : 'local dev'})`);

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

module.exports = { DATA_DIR, UPLOADS_DIR, DB_PATH };
