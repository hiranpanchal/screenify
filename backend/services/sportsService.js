/**
 * sportsService.js
 * Multi-sport fixture and live game data from TheSportsDB (free tier).
 * Add any sport by adding an entry to SPORTS_CONFIG.
 */

const https = require('https');

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// ── Sport definitions ─────────────────────────────────────────────
// `league` must match TheSportsDB's league name exactly.
// `leagueBadge` is shown in the centre of the generated graphic.

const SPORTS_CONFIG = [
  {
    key: 'premier_league',
    name: 'Premier League',
    emoji: '⚽',
    league: 'English Premier League',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/i6o0kh1549878063.png',
    defaultPromo: 'MATCH DAY SPECIAL — PINTS £4 ALL GAME',
    preGameMinutes: 60,
  },
  {
    key: 'champions_league',
    name: 'Champions League',
    emoji: '⚽',
    league: 'UEFA Champions League',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/cc9mjk1549878060.png',
    defaultPromo: 'CHAMPIONS LEAGUE NIGHT — PINTS £4',
    preGameMinutes: 60,
  },
  {
    key: 'europa_league',
    name: 'Europa League',
    emoji: '⚽',
    league: 'UEFA Europa League',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/ehj0zy1549878063.png',
    defaultPromo: 'EUROPA LEAGUE NIGHT — HAPPY HOUR',
    preGameMinutes: 60,
  },
  {
    key: 'nfl',
    name: 'NFL',
    emoji: '🏈',
    league: 'NFL',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/joxus31547831734.png',
    defaultPromo: 'NFL SUNDAY — WINGS & BEERS £12',
    preGameMinutes: 60,
  },
  {
    key: 'nba',
    name: 'NBA',
    emoji: '🏀',
    league: 'NBA',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/ajqbbp1547834657.png',
    defaultPromo: 'NBA LIVE — HAPPY HOUR ALL GAME',
    preGameMinutes: 30,
  },
  {
    key: 'nhl',
    name: 'NHL',
    emoji: '🏒',
    league: 'NHL',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/nhlfull1422529783.png',
    defaultPromo: 'HOCKEY NIGHT — COCKTAILS 2 FOR 1',
    preGameMinutes: 30,
  },
  {
    key: 'mlb',
    name: 'MLB',
    emoji: '⚾',
    league: 'MLB',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/mlbfull1422479070.png',
    defaultPromo: 'BASEBALL NIGHT — LOADED NACHOS & BEER',
    preGameMinutes: 30,
  },
  {
    key: 'rugby_premiership',
    name: 'Rugby Premiership',
    emoji: '🏉',
    league: 'English Premiership',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/4qmq351549879062.png',
    defaultPromo: 'RUGBY TODAY — TABLE BOOKING RECOMMENDED',
    preGameMinutes: 60,
  },
  {
    key: 'six_nations',
    name: 'Six Nations',
    emoji: '🏉',
    league: 'Six Nations',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/d9ihox1674141855.png',
    defaultPromo: 'SIX NATIONS LIVE — BOOK YOUR TABLE',
    preGameMinutes: 60,
  },
  {
    key: 'ufc',
    name: 'UFC / MMA',
    emoji: '🥊',
    league: 'UFC',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/xyutiu1566040299.png',
    defaultPromo: 'FIGHT NIGHT — WINGS & BEERS £12',
    preGameMinutes: 90,
  },
  {
    key: 'formula1',
    name: 'Formula 1',
    emoji: '🏎️',
    league: 'Formula 1',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/formula1full1547831754.png',
    defaultPromo: 'RACE DAY — COCKTAILS FROM £8',
    preGameMinutes: 30,
  },
  {
    key: 'cricket_ipl',
    name: 'Cricket — IPL',
    emoji: '🏏',
    league: 'Indian Premier League',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/cricket.png',
    defaultPromo: 'IPL LIVE — BAR OPEN LATE',
    preGameMinutes: 30,
  },
];

module.exports = { SPORTS_CONFIG };

// ── Data fetching ─────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Screenifi/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

async function getTodaysGames(leagueName) {
  const today = new Date().toISOString().split('T')[0];
  const enc   = encodeURIComponent(leagueName);
  const data  = await fetchJSON(`${BASE}/eventsday.php?d=${today}&l=${enc}`);
  return data.events || [];
}

async function getLiveGames(leagueName) {
  const data   = await fetchJSON(`${BASE}/eventslive.php`);
  const events = data.events || [];
  return events.filter(e => e.strLeague === leagueName);
}

/**
 * Returns active games for a sport config entry.
 * "Active" = live OR kicking off within preGameMinutes.
 */
async function getActiveGamesForSport(sportConfig) {
  const { league, preGameMinutes = 60 } = sportConfig;

  const [live, today] = await Promise.all([
    getLiveGames(league).catch(() => []),
    getTodaysGames(league).catch(() => []),
  ]);

  const now        = Date.now();
  const preMs      = preGameMinutes * 60 * 1000;
  const postMs     = 135 * 60 * 1000; // ~2h15 window after KO

  const upcoming = today.filter(g => {
    if (!g.strTime || !g.dateEvent) return false;
    const ko = new Date(`${g.dateEvent}T${g.strTime}Z`).getTime();
    if (isNaN(ko)) return false;
    return now >= ko - preMs && now < ko + postMs;
  });

  const all  = [...live, ...upcoming];
  const seen = new Set();
  return all.filter(g => {
    if (seen.has(g.idEvent)) return false;
    seen.add(g.idEvent);
    return true;
  });
}

module.exports = { SPORTS_CONFIG, getTodaysGames, getLiveGames, getActiveGamesForSport };
