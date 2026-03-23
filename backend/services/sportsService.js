/**
 * sportsService.js
 * Multi-sport fixture data using ESPN's public scoreboard API (no key required)
 * and TheSportsDB as fallback for sports ESPN doesn't cover well.
 *
 * ESPN scoreboard docs (unofficial):
 *   https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard
 */

const https = require('https');

// ── Sport definitions ─────────────────────────────────────────────
const SPORTS_CONFIG = [
  {
    key: 'premier_league',
    name: 'Premier League',
    emoji: '⚽',
    espnEndpoint: 'soccer/eng.1',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
    defaultPromo: 'MATCH DAY SPECIAL — PINTS £4 ALL GAME',
    preGameMinutes: 60,
  },
  {
    key: 'champions_league',
    name: 'Champions League',
    emoji: '⚽',
    espnEndpoint: 'soccer/uefa.champions',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
    defaultPromo: 'CHAMPIONS LEAGUE NIGHT — PINTS £4',
    preGameMinutes: 60,
  },
  {
    key: 'europa_league',
    name: 'Europa League',
    emoji: '⚽',
    espnEndpoint: 'soccer/uefa.europa',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png',
    defaultPromo: 'EUROPA LEAGUE NIGHT — HAPPY HOUR',
    preGameMinutes: 60,
  },
  {
    key: 'nba',
    name: 'NBA',
    emoji: '🏀',
    espnEndpoint: 'basketball/nba',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/nba/500/nba-dark.png',
    defaultPromo: 'NBA LIVE — HAPPY HOUR ALL GAME',
    preGameMinutes: 30,
  },
  {
    key: 'nfl',
    name: 'NFL',
    emoji: '🏈',
    espnEndpoint: 'football/nfl',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/nfl/500/nfl.png',
    defaultPromo: 'NFL SUNDAY — WINGS & BEERS £12',
    preGameMinutes: 60,
  },
  {
    key: 'nhl',
    name: 'NHL',
    emoji: '🏒',
    espnEndpoint: 'hockey/nhl',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/nhl/500/nhl.png',
    defaultPromo: 'HOCKEY NIGHT — COCKTAILS 2 FOR 1',
    preGameMinutes: 30,
  },
  {
    key: 'mlb',
    name: 'MLB',
    emoji: '⚾',
    espnEndpoint: 'baseball/mlb',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/mlb/500/mlb.png',
    defaultPromo: 'BASEBALL NIGHT — LOADED NACHOS & BEER',
    preGameMinutes: 30,
  },
  {
    key: 'ufc',
    name: 'UFC / MMA',
    emoji: '🥊',
    espnEndpoint: 'mma/ufc',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/mma/500/ufc.png',
    defaultPromo: 'FIGHT NIGHT — WINGS & BEERS £12',
    preGameMinutes: 90,
  },
  {
    key: 'rugby_premiership',
    name: 'Rugby Premiership',
    emoji: '🏉',
    espnEndpoint: 'rugby/premiership',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/4qmq351549879062.png',
    defaultPromo: 'RUGBY TODAY — TABLE BOOKING RECOMMENDED',
    preGameMinutes: 60,
  },
  {
    key: 'six_nations',
    name: 'Six Nations',
    emoji: '🏉',
    espnEndpoint: 'rugby/internationals',
    leagueBadge: 'https://www.thesportsdb.com/images/media/league/badge/d9ihox1674141855.png',
    defaultPromo: 'SIX NATIONS LIVE — BOOK YOUR TABLE',
    preGameMinutes: 60,
  },
  {
    key: 'formula1',
    name: 'Formula 1',
    emoji: '🏎️',
    espnEndpoint: 'racing/f1',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/racing/500/f1.png',
    defaultPromo: 'RACE DAY — COCKTAILS FROM £8',
    preGameMinutes: 60,
  },
  {
    key: 'cricket_intl',
    name: 'Cricket',
    emoji: '🏏',
    espnEndpoint: 'cricket/international',
    leagueBadge: 'https://a.espncdn.com/i/leaguelogos/cricket/500/9.png',
    defaultPromo: 'CRICKET LIVE — BAR OPEN LATE',
    preGameMinutes: 30,
  },
];

module.exports = { SPORTS_CONFIG };

// ── HTTP helper ───────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Screenifi/1.0' } }, (res) => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from ${url}`)); }
      });
    }).on('error', reject);
  });
}

// ── ESPN data fetching ────────────────────────────────────────────

/**
 * Fetches today's scoreboard from ESPN for a given endpoint.
 * Returns a normalised array of game objects.
 */
async function fetchESPNScoreboard(espnEndpoint) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${espnEndpoint}/scoreboard`;
  const data = await fetchJSON(url);
  const events = data.events || [];

  return events.map(event => {
    const comp        = (event.competitions || [])[0] || {};
    const competitors = comp.competitors || [];
    const home        = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
    const away        = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};
    const status      = comp.status || {};
    const stateType   = (status.type || {}).state || 'pre'; // pre | in | post

    return {
      id:           event.id,
      homeTeam:     (home.team || {}).displayName || 'Home',
      awayTeam:     (away.team || {}).displayName || 'Away',
      homeBadgeUrl: (home.team || {}).logo || null,
      awayBadgeUrl: (away.team || {}).logo || null,
      startTime:    new Date(comp.date || event.date),
      state:        stateType,      // 'pre' | 'in' | 'post'
      isLive:       stateType === 'in',
      isFinished:   stateType === 'post',
    };
  });
}

/**
 * Returns games that are live OR kicking off within preGameMinutes.
 */
async function getActiveGamesForSport(sportConfig) {
  const { espnEndpoint, preGameMinutes = 60 } = sportConfig;
  const games  = await fetchESPNScoreboard(espnEndpoint);
  const now    = Date.now();
  const preMs  = preGameMinutes * 60 * 1000;

  return games.filter(g => {
    if (g.isFinished) return false;
    if (g.isLive)     return true;
    // Upcoming within window
    const diff = g.startTime.getTime() - now;
    return diff >= 0 && diff <= preMs;
  });
}

/**
 * Returns all of today's games for a sport (for the fixtures preview).
 */
async function getTodaysGames(espnEndpoint) {
  return fetchESPNScoreboard(espnEndpoint);
}

module.exports = { SPORTS_CONFIG, getActiveGamesForSport, getTodaysGames };
