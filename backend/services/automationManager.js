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
    // 1. Check each sport in turn for LIVE games — live always takes priority
    let handled = false;
    for (const sport of SPORTS_CONFIG) {
      const enabled = getSetting(`sport_${sport.key}_enabled`);
      if (enabled !== '1') continue;

      const games = await getActiveGamesForSport(sport).catch(() => []);
      if (games.length > 0) {
        await ensureGraphicForGame(sport, games[0], 'live');
        handled = true;
        break;
      }
    }

    // 2. If no live game, check pinned upcoming games
    if (!handled) {
      await removeActiveGraphic();
      await syncPinnedGames();
    }
  } catch (e) {
    console.error('[Automation] Error:', e.message);
  } finally {
    running = false;
  }
}

/**
 * Regenerate graphics for all pinned upcoming games (keeps them fresh
 * if the user hasn't removed them and they haven't gone live yet).
 */
async function syncPinnedGames() {
  const pins = db.prepare('SELECT * FROM pinned_games ORDER BY start_time ASC').all();
  for (const pin of pins) {
    const startMs = new Date(pin.start_time).getTime();
    // If game has ended (>3h past start), clean it up
    if (Date.now() > startMs + 3 * 60 * 60 * 1000) {
      await removePinnedGame(pin.id);
      continue;
    }
    // If graphic is missing, regenerate
    if (pin.media_id) {
      const row = db.prepare('SELECT id FROM media WHERE id = ?').get(pin.media_id);
      if (row) continue; // still exists
    }
    await generatePinnedGraphic(pin);
  }
}

async function generatePinnedGraphic(pin) {
  const sport = SPORTS_CONFIG.find(s => s.key === pin.sport_key);
  if (!sport) return;

  const promoText   = getSetting(`sport_${pin.sport_key}_promo_text`) || sport.defaultPromo;
  const barLogoFile = getSetting('automation_bar_logo');
  const barLogoPath = barLogoFile ? path.join(__dirname, '../uploads', barLogoFile) : null;

  const { filename } = await generateMatchGraphic({
    homeTeam:       pin.home_team,
    awayTeam:       pin.away_team,
    homeBadgeUrl:   pin.home_badge_url,
    awayBadgeUrl:   pin.away_badge_url,
    leagueBadgeUrl: pin.league_badge_url,
    mode:           'upcoming',
    startTime:      new Date(pin.start_time),
    isLive:         false,
    promoText,
    barLogoPath,
  });

  const mediaId = uuidv4();
  const size    = fs.statSync(path.join(__dirname, '../uploads', filename)).size;

  db.prepare('UPDATE media SET sort_order = sort_order + 1').run();
  db.prepare(`
    INSERT INTO media (id, filename, original_name, mimetype, type, size, duration, sort_order, source)
    VALUES (?, ?, ?, 'image/png', 'image', ?, 20, 1, 'pinned')
  `).run(mediaId, filename, `${pin.home_team} vs ${pin.away_team}`, size);

  // Delete old graphic file/record if exists
  if (pin.media_id) {
    const old = db.prepare('SELECT filename FROM media WHERE id = ?').get(pin.media_id);
    if (old) {
      try { fs.unlinkSync(path.join(__dirname, '../uploads', old.filename)); } catch { /* ok */ }
      db.prepare('DELETE FROM media WHERE id = ?').run(pin.media_id);
    }
  }

  db.prepare('UPDATE pinned_games SET media_id = ? WHERE id = ?').run(mediaId, pin.id);
  console.log(`[Automation] Pinned graphic generated: ${pin.home_team} vs ${pin.away_team}`);
}

async function removePinnedGame(pinId) {
  const pin = db.prepare('SELECT * FROM pinned_games WHERE id = ?').get(pinId);
  if (!pin) return;
  if (pin.media_id) {
    const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(pin.media_id);
    if (row) {
      try { fs.unlinkSync(path.join(__dirname, '../uploads', row.filename)); } catch { /* ok */ }
      db.prepare('DELETE FROM media WHERE id = ?').run(pin.media_id);
    }
  }
  db.prepare('DELETE FROM pinned_games WHERE id = ?').run(pinId);
}

async function ensureGraphicForGame(sport, game, mode = 'live') {
  const activeKey     = getSetting('automation_active_game_key');
  const activeMediaId = getSetting('automation_active_media_id');
  const gameUniqueKey = `${sport.key}:${game.id}`;

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

  const isLive = game.isLive || false;

  let kickoffTime = '';
  if (game.startTime) {
    try {
      kickoffTime = new Date(game.startTime).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
      });
    } catch { /* skip */ }
  }

  console.log(`[Automation] Generating ${sport.name} graphic: ${game.homeTeam} vs ${game.awayTeam}`);

  const { filename } = await generateMatchGraphic({
    homeTeam:       game.homeTeam,
    awayTeam:       game.awayTeam,
    homeBadgeUrl:   game.homeBadgeUrl,
    awayBadgeUrl:   game.awayBadgeUrl,
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
  `).run(mediaId, filename, `${game.homeTeam} vs ${game.awayTeam}`, size);

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

module.exports = { init, triggerNow, removeActiveGraphic, generatePinnedGraphic, removePinnedGame };
