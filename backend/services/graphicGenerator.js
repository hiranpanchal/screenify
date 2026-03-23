/**
 * graphicGenerator.js
 * Generates a 1920×1080 match-day promotional graphic.
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │          [ Bar Logo ]                  │  ← top centre
 *   │                                        │
 *   │  [Home Badge]  [PL Badge]  [Away Badge]│  ← centre row
 *   │   Home Team       VS       Away Team   │
 *   │                                        │
 *   │  ═══ MATCH DAY SPECIAL — PINTS £4 ═══ │  ← Electric Blue bar
 *   └────────────────────────────────────────┘
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs   = require('fs');
const https = require('https');
const http  = require('http');

const { UPLOADS_DIR } = require('../config/paths');
const W = 1920;
const H = 1080;

// ── Helpers ──────────────────────────────────────────────────────

function fetchBuffer(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'Screenifi/1.0' } }, (res) => {
      // Follow redirects for badge images
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        return fetchBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Badge image fetch timed out: ${url}`));
    });
  });
}

async function loadRemoteImage(url) {
  if (!url) return null;
  try {
    const buf = await fetchBuffer(url);
    return await loadImage(buf);
  } catch { return null; }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawImageFit(ctx, img, cx, cy, size) {
  if (!img) return;
  const scale = size / Math.max(img.width, img.height);
  const dw = img.width  * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

// ── Main generator ───────────────────────────────────────────────

/**
 * Generates a human-readable date badge label for upcoming games.
 * e.g. "TONIGHT  20:00" / "TOMORROW  15:00" / "SAT  12:30"
 */
function buildDateLabel(startTime) {
  const now      = new Date();
  const game     = new Date(startTime);
  const todayDay = now.toDateString();
  const gameDayStr = game.toDateString();

  const timeStr = game.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (gameDayStr === todayDay) return `TONIGHT  ${timeStr}`;
  if (gameDayStr === tomorrow.toDateString()) return `TOMORROW  ${timeStr}`;

  const dayName = game.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/London' }).toUpperCase();
  return `${dayName}  ${timeStr}`;
}

async function generateMatchGraphic({
  homeTeam, awayTeam,
  homeBadgeUrl, awayBadgeUrl,
  leagueBadgeUrl,
  kickoffTime, isLive,
  mode = 'live',   // 'live' | 'upcoming' | 'ko'
  startTime,       // ISO string — used for upcoming badge label
  promoText,
  barLogoPath,
  filenamePrefix = 'match_',
}) {
  const plBadgeUrl = leagueBadgeUrl; // alias for internal use
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background ──────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#050f1e');
  bg.addColorStop(0.5, '#0B1F3A');
  bg.addColorStop(1,   '#050f1e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(47,128,237,0.06)';
  for (let x = 40; x < W; x += 80) {
    for (let y = 40; y < H; y += 80) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Top Electric Blue accent stripe
  ctx.fillStyle = '#2F80ED';
  ctx.fillRect(0, 0, W, 6);

  // ── Bar logo (top centre) ────────────────────────────────────
  const barLogoY  = 50;
  const barLogoH  = 110;
  if (barLogoPath && fs.existsSync(barLogoPath)) {
    try {
      const barLogo = await loadImage(fs.readFileSync(barLogoPath));
      const scale   = barLogoH / barLogo.height;
      const bw      = barLogo.width * scale;
      ctx.drawImage(barLogo, (W - bw) / 2, barLogoY, bw, barLogoH);
    } catch { /* skip */ }
  }

  // ── Team badges + PL badge (centre row) ─────────────────────
  const [homeBadge, awayBadge, plBadge] = await Promise.all([
    loadRemoteImage(homeBadgeUrl),
    loadRemoteImage(awayBadgeUrl),
    loadRemoteImage(plBadgeUrl),
  ]);

  const badgeCY   = H / 2 - 30;
  const badgeSize = 260;
  const plSize    = 180;
  const spread    = 380; // distance from centre to outer badges

  drawImageFit(ctx, homeBadge, W / 2 - spread, badgeCY, badgeSize);
  drawImageFit(ctx, plBadge,   W / 2,           badgeCY, plSize);
  drawImageFit(ctx, awayBadge, W / 2 + spread,  badgeCY, badgeSize);

  // ── Status pill (LIVE / KO time / Coming Up) ─────────────────
  const pillH = 48, pillY = badgeCY - badgeSize / 2 - 80;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isLive) {
    const pillW = 160;
    ctx.fillStyle = '#dc2626';
    roundRect(ctx, W / 2 - pillW / 2, pillY, pillW, pillH, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⬤  LIVE', W / 2, pillY + pillH / 2);
  } else if (mode === 'upcoming' && startTime) {
    const label  = buildDateLabel(startTime);
    const pillW  = Math.max(280, label.length * 16 + 60);
    // Amber/gold pill for upcoming games
    ctx.fillStyle = 'rgba(217,119,6,0.18)';
    roundRect(ctx, W / 2 - pillW / 2, pillY, pillW, pillH, 24);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(label, W / 2, pillY + pillH / 2);
  } else if (kickoffTime) {
    const pillW = 200;
    ctx.fillStyle = 'rgba(47,128,237,0.18)';
    roundRect(ctx, W / 2 - pillW / 2, pillY, pillW, pillH, 24);
    ctx.fill();
    ctx.strokeStyle = '#2F80ED';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#2F80ED';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`KO  ${kickoffTime}`, W / 2, pillY + pillH / 2);
  }
  ctx.restore();

  // ── Team names ───────────────────────────────────────────────
  const nameY = badgeCY + badgeSize / 2 + 50;
  ctx.font      = 'bold 48px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(homeTeam || '', W / 2 - spread, nameY);
  ctx.fillText(awayTeam || '', W / 2 + spread, nameY);

  // VS text between badges
  ctx.font      = 'bold 36px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('VS', W / 2, nameY);

  // ── Bottom promo bar ─────────────────────────────────────────
  const barH = 120;
  const grad = ctx.createLinearGradient(0, H - barH, W, H);
  grad.addColorStop(0, 'rgba(47,128,237,0.95)');
  grad.addColorStop(1, 'rgba(20,80,180,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - barH, W, barH);

  // Small decorative lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - barH); ctx.lineTo(W, H - barH); ctx.stroke();

  ctx.font      = 'bold 50px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(promoText || 'MATCH DAY SPECIAL', W / 2, H - barH / 2);

  // ── Save PNG ─────────────────────────────────────────────────
  const filename = `${filenamePrefix}${Date.now()}.png`;
  const filepath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filepath, canvas.toBuffer('image/png'));

  return { filename, filepath };
}

module.exports = { generateMatchGraphic };
