/**
 * automationManager.js
 * Polls for active Premier League games every 5 minutes.
 * When a game is found: generates a match graphic and pins it first in the playlist.
 * When no game is active: removes the generated graphic automatically.
 */

const cron = require('node-cron');
const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getActiveGames } = require('./footballService');
const { generateMatchGraphic } = require('./graphicGenerator');

let db        = null;
let cronJob   = null;
let running   = false; // prevent overlapping runs

// ── Public API ────────────────────────────────────────────────────

function init(database) {
  db = database;
  // Run immediately, then every 5 minutes
  runCheck();
  cronJob = cron.schedule('*/5 * * * *', runCheck);
  console.log('[Automation] Football graphic manager started');
}

// Called by the admin UI to force an immediate refresh
async function triggerNow() {
  return runCheck();
}

// ── Core logic ────────────────────────────────────────────────────

async function runCheck() {
  if (running) return;
  running = true;
  try {
    const enabled = getSetting('football_enabled');
    if (enabled !== '1') {
      // If disabled, clean up any existing graphic
      await removeActiveGraphic();
      return;
    }
    await checkGames();
  } catch (e) {
    console.error('[Automation] Error during check:', e.message);
  } finally {
    running = false;
  }
}

async function checkGames() {
  const games = await getActiveGames();

  if (games.length === 0) {
    await removeActiveGraphic();
    return;
  }

  const game           = games[0]; // show the first active game
  const activeGameKey  = getSetting('football_active_game_key');
  const activeMediaId  = getSetting('football_active_media_id');

  // Already showing this exact game — nothing to do
  if (activeGameKey === game.idEvent && activeMediaId) {
    // Still check if the graphic file actually exists
    const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(activeMediaId);
    if (row) return;
  }

  // Remove previous graphic (different game, or file missing)
  await removeActiveGraphic();

  // Generate the new graphic
  const promoText  = getSetting('football_promo_text') || 'MATCH DAY SPECIAL — PINTS £4 ALL GAME';
  const barLogoFile = getSetting('football_bar_logo');
  const barLogoPath = barLogoFile
    ? path.join(__dirname, '../uploads', barLogoFile)
    : null;

  // Determine if the game is currently live
  const isLive = !!(
    game.intHomeScore !== null ||
    game.strStatus === 'In Progress' ||
    game.strStatus === '1H' ||
    game.strStatus === 'HT' ||
    game.strStatus === '2H'
  );

  // Format KO time from UTC strTime (HH:MM:SS) to local HH:MM
  let kickoffTime = '';
  if (game.strTime) {
    try {
      const utcStr = `${game.dateEvent}T${game.strTime}Z`;
      kickoffTime = new Date(utcStr).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
      });
    } catch { kickoffTime = game.strTime.slice(0, 5); }
  }

  // TheSportsDB provides league badge via a separate call but the event
  // includes idLeague — we hard-code the PL badge URL as it's stable.
  const plBadgeUrl = 'https://www.thesportsdb.com/images/media/league/badge/i6o0kh1549878063.png';

  console.log(`[Automation] Generating graphic: ${game.strHomeTeam} vs ${game.strAwayTeam}`);

  const { filename } = await generateMatchGraphic({
    homeTeam:     game.strHomeTeam,
    awayTeam:     game.strAwayTeam,
    homeBadgeUrl: game.strHomeTeamBadge,
    awayBadgeUrl: game.strAwayTeamBadge,
    plBadgeUrl,
    kickoffTime,
    isLive,
    promoText,
    barLogoPath,
  });

  // Insert into media library, pinned at sort_order 0 (top)
  db.prepare('UPDATE media SET sort_order = sort_order + 1').run();

  const mediaId = uuidv4();
  const size    = fs.statSync(path.join(__dirname, '../uploads', filename)).size;

  db.prepare(`
    INSERT INTO media (id, filename, original_name, mimetype, type, size, duration, sort_order, source)
    VALUES (?, ?, ?, 'image/png', 'image', ?, 30, 0, 'automation')
  `).run(mediaId, filename, `${game.strHomeTeam} vs ${game.strAwayTeam}`, size);

  setSetting('football_active_media_id', mediaId);
  setSetting('football_active_game_key', game.idEvent);

  console.log(`[Automation] Match graphic live: ${filename}`);
}

async function removeActiveGraphic() {
  const mediaId = getSetting('football_active_media_id');
  if (!mediaId) return;

  const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(mediaId);
  if (row) {
    const fp = path.join(__dirname, '../uploads', row.filename);
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ok */ }
    db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);
    console.log('[Automation] Removed match graphic');
  }

  setSetting('football_active_media_id', '');
  setSetting('football_active_game_key', '');
}

// ── Settings helpers ──────────────────────────────────────────────

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = { init, triggerNow, removeActiveGraphic };
