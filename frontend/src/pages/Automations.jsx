import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', border: 'none',
        background: on ? 'var(--accent)' : 'var(--border)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: on ? '22px' : '2px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

function PreviewModal({ sport, onClose }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.post(`/automations/preview/${sport.key}`)
      .then(r => setResult(r.data))
      .catch(() => setError('Preview generation failed'))
      .finally(() => setLoading(false));
  }, [sport.key]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>
            {sport.emoji} {sport.name} — Graphic Preview
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
              borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '13px',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div style={{
            background: '#0B1F3A', borderRadius: '8px', height: '300px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', fontSize: '14px',
          }}>
            Generating graphic…
          </div>
        )}
        {error && (
          <div style={{
            background: '#1a0a0a', borderRadius: '8px', height: '200px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#f87171', fontSize: '14px',
          }}>
            {error}
          </div>
        )}
        {result && (
          <>
            <img
              src={result.url}
              alt="Match graphic preview"
              style={{ width: '100%', borderRadius: '8px', display: 'block', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              {result.usedReal
                ? `Using real fixture: ${result.homeTeam} vs ${result.awayTeam}`
                : 'No fixtures found — showing placeholder data'}
              {' · '} Click outside to close
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SportCard({ sport, activeSport, onUpdate, onFlash, onPinsChanged }) {
  const [promoText, setPromoText]       = useState(sport.promoText);
  const [expanded, setExpanded]         = useState(false);
  const [tab, setTab]                   = useState('today'); // 'today' | 'upcoming'
  const [fixtures, setFixtures]         = useState(null);
  const [upcoming, setUpcoming]         = useState(null);
  const [loadingFix, setLoadingFix]     = useState(false);
  const [loadingUp, setLoadingUp]       = useState(false);
  const [pinning, setPinning]           = useState({}); // gameId → bool
  const [saving, setSaving]             = useState(false);
  const [previewing, setPreviewing]     = useState(false);
  const isActive = activeSport === sport.key;

  async function toggle() {
    await onUpdate(sport.key, { enabled: !sport.enabled });
  }

  async function savePromo() {
    setSaving(true);
    await onUpdate(sport.key, { promoText });
    setSaving(false);
  }

  async function loadFixtures() {
    if (!expanded) {
      setExpanded(true);
      if (!fixtures) fetchToday();
    } else {
      setExpanded(false);
    }
  }

  async function fetchToday() {
    setLoadingFix(true);
    try {
      const res = await api.get(`/automations/fixtures/${sport.key}`);
      setFixtures(res.data);
    } catch { setFixtures([]); }
    finally { setLoadingFix(false); }
  }

  async function fetchUpcoming() {
    setLoadingUp(true);
    try {
      const res = await api.get(`/automations/upcoming/${sport.key}`);
      setUpcoming(res.data);
    } catch { setUpcoming([]); }
    finally { setLoadingUp(false); }
  }

  async function switchTab(t) {
    setTab(t);
    if (t === 'upcoming' && !upcoming) fetchUpcoming();
    if (t === 'today'    && !fixtures)  fetchToday();
  }

  async function pinGame(game) {
    setPinning(p => ({ ...p, [game.id]: true }));
    try {
      await api.post('/automations/pin', {
        sportKey:     sport.key,
        gameId:       game.id,
        homeTeam:     game.home,
        awayTeam:     game.away,
        homeBadgeUrl: game.homeBadge,
        awayBadgeUrl: game.awayBadge,
        startTime:    game.startTime,
      });
      // Mark as pinned locally
      setUpcoming(prev => prev.map(g => g.id === game.id ? { ...g, isPinned: true } : g));
      onFlash('success', `📌 Advertising ${game.home} vs ${game.away}`);
      onPinsChanged();
    } catch { onFlash('error', 'Pin failed'); }
    finally { setPinning(p => ({ ...p, [game.id]: false })); }
  }

  return (
    <>
      {previewing && <PreviewModal sport={sport} onClose={() => setPreviewing(false)} />}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', overflow: 'hidden',
        boxShadow: isActive ? '0 0 0 3px rgba(47,128,237,0.12)' : 'none',
        transition: 'all 0.2s',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{sport.emoji}</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sport.name}
                {isActive && (
                  <span style={{
                    background: '#dc2626', color: '#fff', fontSize: '10px',
                    fontWeight: '700', padding: '1px 7px', borderRadius: '10px',
                    letterSpacing: '0.05em',
                  }}>LIVE</span>
                )}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {sport.enabled ? 'Auto-detecting games' : 'Disabled'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setPreviewing(true)}
              title="Preview graphic"
              style={{
                padding: '4px 12px', fontSize: '12px', fontWeight: '500',
                borderRadius: '6px', border: '1px solid var(--border)',
                color: 'var(--text-muted)', background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Preview
            </button>
            <Toggle on={sport.enabled} onChange={toggle} />
          </div>
        </div>

      {/* Expanded config */}
      {sport.enabled && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', background: 'var(--surface2)' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>
              PROMO MESSAGE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={promoText}
                onChange={e => setPromoText(e.target.value)}
                maxLength={80}
                style={{ flex: 1, fontSize: '13px' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={savePromo}
                disabled={saving || promoText === sport.promoText}
                style={{ flexShrink: 0 }}
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>

          <button
            onClick={loadFixtures}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px' }}
          >
            {expanded ? 'Hide fixtures' : 'View fixtures'}
          </button>

          {expanded && (
            <div style={{ marginTop: '12px' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {['today', 'upcoming'].map(t => (
                  <button key={t} onClick={() => switchTab(t)} style={{
                    padding: '4px 12px', fontSize: '12px', fontWeight: '500',
                    borderRadius: '20px', border: '1px solid var(--border)',
                    background: tab === t ? 'var(--accent)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}>
                    {t === 'today' ? 'Today' : 'Upcoming (7 days)'}
                  </button>
                ))}
              </div>

              {/* Today */}
              {tab === 'today' && (
                loadingFix ? <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Loading…</div>
                : (fixtures || []).length === 0 ? <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No games today</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(fixtures || []).map(f => (
                      <div key={f.id} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px',
                      }}>
                        <span><strong>{f.home}</strong> <span style={{ color: 'var(--text-muted)' }}>vs</span> <strong>{f.away}</strong></span>
                        {f.isLive ? <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '11px' }}>LIVE</span>
                          : f.isFinished ? <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>FT</span>
                          : <span style={{ color: 'var(--text-muted)' }}>{f.time || '—'}</span>}
                      </div>
                    ))}
                  </div>
              )}

              {/* Upcoming */}
              {tab === 'upcoming' && (
                loadingUp ? <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Loading…</div>
                : (upcoming || []).length === 0 ? <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No upcoming games found</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {(upcoming || []).map(g => (
                      <div key={g.id} style={{
                        background: 'var(--surface)', border: `1px solid ${g.isPinned ? '#d97706' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px',
                      }}>
                        <div>
                          <div><strong>{g.home}</strong> <span style={{ color: 'var(--text-muted)' }}>vs</span> <strong>{g.away}</strong></div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{g.dateLabel}  ·  {g.timeLabel}</div>
                        </div>
                        <button
                          onClick={() => pinGame(g)}
                          disabled={g.isPinned || pinning[g.id]}
                          style={{
                            padding: '4px 12px', fontSize: '11.5px', fontWeight: '600',
                            borderRadius: '6px', border: '1px solid',
                            borderColor: g.isPinned ? '#d97706' : 'var(--accent)',
                            color: g.isPinned ? '#d97706' : 'var(--accent)',
                            background: 'transparent', cursor: g.isPinned ? 'default' : 'pointer',
                            flexShrink: 0, marginLeft: '10px',
                          }}
                        >
                          {pinning[g.id] ? '…' : g.isPinned ? '📌 Pinned' : '+ Advertise'}
                        </button>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

export default function Automations() {
  const [sports, setSports]           = useState([]);
  const [barLogo, setBarLogo]         = useState('');
  const [activeSport, setActiveSport] = useState('');
  const [activeMediaId, setActiveMediaId] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [triggering, setTriggering]   = useState(false);
  const [toast, setToast]             = useState(null);
  const [pins, setPins]               = useState([]);
  const [removingPin, setRemovingPin] = useState({});
  const logoRef = useRef();

  useEffect(() => { load(); loadPins(); }, []);

  async function load() {
    try {
      const res = await api.get('/automations');
      setSports(res.data.sports);
      setBarLogo(res.data.barLogo);
      setActiveSport(res.data.activeSport);
      setActiveMediaId(res.data.activeMediaId);
    } catch { flash('error', 'Failed to load'); }
  }

  async function loadPins() {
    try {
      const res = await api.get('/automations/pins');
      setPins(res.data);
    } catch { /* silent */ }
  }

  function flash(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSportUpdate(key, changes) {
    try {
      await api.put(`/automations/sport/${key}`, changes);
      setSports(prev => prev.map(s =>
        s.key === key ? { ...s, ...changes } : s
      ));
      flash('success', 'Saved');
      setTimeout(load, 1500);
    } catch { flash('error', 'Save failed'); }
  }

  async function uploadLogo(file) {
    if (!file) return;
    setLogoUploading(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await api.post('/automations/bar-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      flash('success', 'Bar logo updated');
      load();
    } catch { flash('error', 'Upload failed'); }
    finally { setLogoUploading(false); }
  }

  async function triggerNow() {
    setTriggering(true);
    try {
      await api.post('/automations/trigger');
      flash('success', 'Check triggered — graphic will appear if a game is active');
      setTimeout(load, 2000);
    } catch { flash('error', 'Trigger failed'); }
    finally { setTriggering(false); }
  }

  async function removePin(pinId) {
    setRemovingPin(r => ({ ...r, [pinId]: true }));
    try {
      await api.delete(`/automations/pin/${pinId}`);
      setPins(prev => prev.filter(p => p.id !== pinId));
      flash('success', 'Removed from advertising schedule');
    } catch { flash('error', 'Failed to remove'); }
    finally { setRemovingPin(r => ({ ...r, [pinId]: false })); }
  }

  function formatPinDate(startTime) {
    const d = new Date(startTime);
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    if (d.toDateString() === now.toDateString()) return `Tonight · ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${timeStr}`;
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }) + ` · ${timeStr}`;
  }

  const anyEnabled = sports.some(s => s.enabled);

  return (
    <div style={{ padding: '28px', maxWidth: '760px' }}>

      {toast && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 999,
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toast.type === 'success' ? '#15803d' : '#b91c1c',
          padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <div className="page-title">Automations</div>
          <div className="page-subtitle">
            Auto-generate match day graphics — toggle any sport on and they appear on your screens automatically
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={triggerNow}
          disabled={triggering}
          style={{ flexShrink: 0 }}
        >
          {triggering ? 'Checking…' : '⚡ Test Now'}
        </button>
      </div>

      {/* Active indicator */}
      {activeMediaId && (
        <div style={{
          background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)',
          borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#15803d',
        }}>
          <span style={{
            display: 'inline-block', width: '8px', height: '8px',
            borderRadius: '50%', background: '#16a34a',
            animation: 'pulse 1.5s infinite',
          }} />
          <strong>Match graphic is live on all displays</strong>
          {activeSport && <span style={{ color: '#15803d', opacity: 0.7 }}>
            — {sports.find(s => s.key === activeSport)?.name}
          </span>}
        </div>
      )}

      {/* Bar logo */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '18px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '13.5px', marginBottom: '2px' }}>Bar Logo</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Appears at the top of every match graphic. PNG with transparent background works best.
          </div>
        </div>
        {barLogo && (
          <img
            src={`/uploads/${barLogo}`}
            alt="Bar logo"
            style={{ height: '44px', objectFit: 'contain', background: '#111', borderRadius: '4px', padding: '4px' }}
          />
        )}
        <button
          className="btn btn-ghost"
          onClick={() => logoRef.current.click()}
          disabled={logoUploading}
          style={{ flexShrink: 0 }}
        >
          {logoUploading ? 'Uploading…' : barLogo ? 'Replace' : 'Upload Logo'}
        </button>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => uploadLogo(e.target.files[0])} />
      </div>

      {/* Currently advertising */}
      {pins.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Currently Advertising
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pins.map(pin => (
              <div key={pin.id} style={{
                background: 'var(--surface)', border: '1px solid #d97706',
                borderRadius: 'var(--radius)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    background: 'rgba(217,119,6,0.12)', color: '#d97706',
                    fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '10px', letterSpacing: '0.05em',
                  }}>UPCOMING</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                      {pin.home_team} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>vs</span> {pin.away_team}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {formatPinDate(pin.start_time)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removePin(pin.id)}
                  disabled={removingPin[pin.id]}
                  style={{
                    padding: '4px 12px', fontSize: '12px', fontWeight: '500',
                    borderRadius: '6px', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', background: 'transparent',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {removingPin[pin.id] ? '…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sport cards */}
      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
        Sports
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sports.map(sport => (
          <SportCard
            key={sport.key}
            sport={sport}
            activeSport={activeSport}
            barLogo={barLogo}
            onUpdate={handleSportUpdate}
            onFlash={flash}
            onPinsChanged={loadPins}
          />
        ))}
      </div>

      {!anyEnabled && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
          Toggle any sport on to start auto-generating match graphics
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
