/**
 * footballService.js
 * Fetches Premier League fixtures and live matches from TheSportsDB (free tier).
 */

const https = require('https');

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Screenifi/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from TheSportsDB')); }
      });
    }).on('error', reject);
  });
}

// Get today's Premier League fixtures
async function getTodaysPLGames() {
  const today = new Date().toISOString().split('T')[0];
  const url = `${BASE}/eventsday.php?d=${today}&l=English%20Premier%20League`;
  const data = await fetchJSON(url);
  return data.events || [];
}

// Get currently live PL games
async function getLivePLGames() {
  const url = `${BASE}/eventslive.php`;
  const data = await fetchJSON(url);
  const events = data.events || [];
  return events.filter(e => e.strLeague === 'English Premier League');
}

/**
 * Returns games that are:
 *   - Currently live, OR
 *   - Kicking off within the next 60 minutes
 */
async function getActiveGames() {
  const [liveGames, todaysGames] = await Promise.all([
    getLivePLGames().catch(() => []),
    getTodaysPLGames().catch(() => []),
  ]);

  const now = Date.now();
  const PRE_GAME_MS  = 60 * 60 * 1000;  // show 60 min before KO
  const POST_GAME_MS = 120 * 60 * 1000; // hide 2 h after KO (approx full time)

  const upcoming = todaysGames.filter(game => {
    if (!game.strTime || !game.dateEvent) return false;
    // TheSportsDB times are UTC
    const koMs = new Date(`${game.dateEvent}T${game.strTime}Z`).getTime();
    if (isNaN(koMs)) return false;
    return (now >= koMs - PRE_GAME_MS) && (now < koMs + POST_GAME_MS);
  });

  // Merge live + upcoming, deduplicate by event id
  const merged = [...liveGames, ...upcoming];
  const seen   = new Set();
  return merged.filter(g => {
    if (seen.has(g.idEvent)) return false;
    seen.add(g.idEvent);
    return true;
  });
}

module.exports = { getActiveGames, getTodaysPLGames };
