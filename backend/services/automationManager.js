/**
 * automationManager.js
 * Polls every 5 minutes for active games across all enabled sports.
 * Generates a match graphic and pins it first in the playlist.
 * Removes it automatically when no game is active.
 */

const cron   = require('node-cron');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const { SPORTS_CONFIG, getActiveGamesForSport, getTodaysGames } = require('./sportsService');
const { generateMatchGraphic } = require('./graphicGenerator');

let db      = null;
let cronJob = null;
let running = false;

// ── Public API ────────────────────────────────────────────────────

function init(database) {
  db = database;
  runCheck();
  cronJob = cron.schedule('*/5 * * * *', runCheck);
  console.log('[Automation] Multi-sport graphic manager started');
}

async function triggerNow() {
  return runCheck();
}

// ── Core logic ────────────────────────────────────────────────────

async function runCheck() {
  if (running || !db) return;
  running = true;
  try {
    // Check each sport in turn; first active game wins
    let handled = false;
    for (const sport of SPORTS_CONFIG) {
      const enabled = getSetting(`sport_${sport.key}_enabled`);
      if (enabled !== '1') continue;

      const games = await getActiveGamesForSport(sport).catch(() => []);
      if (games.length > 0) {
        await ensureGraphicForGame(sport, games[0]);
        handled = true;
        break; // show one sport at a time
      }
    }

    if (!handled) {
      await removeActiveGraphic();
    }
  } catch (e) {
    console.error('[Automation] Error:', e.message);
  } finally {
    running = false;
  }
}

async function ensureGraphicForGame(sport, game) {
  const activeKey     = getSetting('automation_active_game_key');
  const activeMediaId = getSetting('automation_active_media_id');
  const gameUniqueKey = `${sport.key}:${game.idEvent}`;

  // Already showing this exact game and file still exists
  if (activeKey === gameUniqueKey && activeMediaId) {
    const row = db.prepare('SELECT id FROM media WHERE id = ?').get(activeMediaId);
    if (row) return;
  }

  // Remove previous graphic
  await removeActiveGraphic();

  // Build graphic params
  const promoText   = getSetting(`sport_${sport.key}_promo_text`) || sport.defaultPromo;
  const barLogoFile = getSetting('automation_bar_logo');
  const barLogoPath = barLogoFile ? path.join(__dirname, '../uploads', barLogoFile) : null;

  const isLive = !!(
    game.intHomeScore !== null ||
    ['In Progress', '1H', 'HT', '2H', 'ET', 'PEN'].includes(game.strStatus)
  );

  let kickoffTime = '';
  if (game.strTime && game.dateEvent) {
    try {
      kickoffTime = new Date(`${game.dateEvent}T${game.strTime}Z`)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    } catch { kickoffTime = (game.strTime || '').slice(0, 5); }
  }

  console.log(`[Automation] Generating ${sport.name} graphic: ${game.strHomeTeam} vs ${game.strAwayTeam}`);

  const { filename } = await generateMatchGraphic({
    homeTeam:     game.strHomeTeam,
    awayTeam:     game.strAwayTeam,
    homeBadgeUrl: game.strHomeTeamBadge,
    awayBadgeUrl: game.strAwayTeamBadge,
    leagueBadgeUrl: sport.leagueBadge,
    kickoffTime,
    isLive,
    promoText,
    barLogoPath,
  });

  // Pin at top of playlist
  db.prepare('UPDATE media SET sort_order = sort_order + 1').run();

  const mediaId = uuidv4();
  const size    = fs.statSync(path.join(__dirname, '../uploads', filename)).size;

  db.prepare(`
    INSERT INTO media (id, filename, original_name, mimetype, type, size, duration, sort_order, source)
    VALUES (?, ?, ?, 'image/png', 'image', ?, 30, 0, 'automation')
  `).run(mediaId, filename, `${game.strHomeTeam} vs ${game.strAwayTeam}`, size);

  setSetting('automation_active_media_id', mediaId);
  setSetting('automation_active_game_key', gameUniqueKey);
  setSetting('automation_active_sport',    sport.key);

  console.log(`[Automation] Graphic live: ${filename}`);
}

async function removeActiveGraphic() {
  const mediaId = getSetting('automation_active_media_id');
  if (!mediaId) return;

  const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(mediaId);
  if (row) {
    const fp = path.join(__dirname, '../uploads', row.filename);
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ok */ }
    db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);
    console.log('[Automation] Removed match graphic');
  }

  setSetting('automation_active_media_id', '');
  setSetting('automation_active_game_key', '');
  setSetting('automation_active_sport',    '');
}

// ── Settings helpers ──────────────────────────────────────────────

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value ?? ''));
}

module.exports = { init, triggerNow, removeActiveGraphic };
