import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function Automations() {
  const [config, setConfig]       = useState(null);
  const [fixtures, setFixtures]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [promoText, setPromoText] = useState('');
  const [enabled, setEnabled]     = useState(false);
  const [logoFile, setLogoFile]   = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [status, setStatus]       = useState(null); // { type, msg }
  const logoInputRef = useRef();

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [cfgRes, fixRes] = await Promise.all([
        api.get('/automations'),
        api.get('/automations/fixtures').catch(() => ({ data: [] })),
      ]);
      setConfig(cfgRes.data);
      setEnabled(cfgRes.data.football_enabled);
      setPromoText(cfgRes.data.football_promo_text);
      setLogoFile(cfgRes.data.football_bar_logo);
      setFixtures(fixRes.data);
    } catch (e) {
      flash('error', 'Failed to load automation settings');
    }
  }

  function flash(type, msg) {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put('/automations', {
        football_enabled: enabled,
        football_promo_text: promoText,
      });
      flash('success', 'Settings saved');
      load();
    } catch { flash('error', 'Save failed'); }
    finally { setSaving(false); }
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
      flash('success', 'Bar logo uploaded');
      load();
    } catch { flash('error', 'Logo upload failed'); }
    finally { setLogoUploading(false); }
  }

  async function triggerNow() {
    setTriggering(true);
    try {
      await api.post('/automations/trigger');
      flash('success', 'Triggered — graphic will appear if a game is active');
      setTimeout(load, 2000);
    } catch (e) { flash('error', e.response?.data?.error || 'Trigger failed'); }
    finally { setTriggering(false); }
  }

  const isActive = !!(config?.football_active_media_id);

  return (
    <div style={{ padding: '28px', maxWidth: '720px' }}>

      {/* Status toast */}
      {status && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 999,
          background: status.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${status.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: status.type === 'success' ? '#15803d' : '#b91c1c',
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
        }}>
          {status.msg}
        </div>
      )}

      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <div className="page-title">Automations</div>
          <div className="page-subtitle">Auto-generate match day graphics for your screens</div>
        </div>
      </div>

      {/* Enable toggle card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px' }}>
            Premier League Match Graphics
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Automatically shows a match graphic when a Premier League game is live or about to kick off.
            Removed from the playlist when no game is active.
          </div>
        </div>
        <button
          onClick={() => setEnabled(e => !e)}
          style={{
            width: '48px', height: '26px', borderRadius: '13px', border: 'none',
            background: enabled ? 'var(--accent)' : 'var(--border)',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            flexShrink: 0, marginLeft: '24px',
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: enabled ? '25px' : '3px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* Status indicator */}
      {isActive && (
        <div style={{
          background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)',
          borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#15803d',
        }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s infinite' }} />
          <strong>Match graphic is live</strong> — showing on all displays
        </div>
      )}

      {/* Promo text */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '16px',
      }}>
        <div style={{ fontWeight: '600', fontSize: '13.5px', marginBottom: '12px' }}>Promo Message</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Bottom banner text</label>
          <input
            value={promoText}
            onChange={e => setPromoText(e.target.value)}
            placeholder="MATCH DAY SPECIAL — PINTS £4 ALL GAME"
            maxLength={80}
          />
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Shown in the Electric Blue banner at the bottom of the graphic. Keep it short and punchy.
          </div>
        </div>
      </div>

      {/* Bar logo upload */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '16px',
      }}>
        <div style={{ fontWeight: '600', fontSize: '13.5px', marginBottom: '12px' }}>Bar Logo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {logoFile && (
            <img
              src={`/uploads/${logoFile}`}
              alt="Bar logo"
              style={{ height: '48px', objectFit: 'contain', borderRadius: '4px', background: '#111', padding: '4px' }}
            />
          )}
          <button
            className="btn btn-ghost"
            onClick={() => logoInputRef.current.click()}
            disabled={logoUploading}
          >
            {logoUploading ? 'Uploading…' : logoFile ? 'Replace Logo' : 'Upload Logo'}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => uploadLogo(e.target.files[0])}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            PNG or SVG with transparent background works best
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        <button className="btn btn-ghost" onClick={triggerNow} disabled={triggering}>
          {triggering ? 'Checking…' : '⚡ Test Now'}
        </button>
      </div>

      {/* Today's fixtures */}
      <div style={{ fontWeight: '600', fontSize: '13.5px', marginBottom: '12px', color: 'var(--text)' }}>
        Today's Premier League Fixtures
      </div>
      {fixtures.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '20px 24px',
          color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center',
        }}>
          No Premier League games today
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fixtures.map(f => (
            <div key={f.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontWeight: '600', fontSize: '13.5px' }}>
                {f.home} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {f.away}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {f.status === 'In Progress' || f.status === '1H' || f.status === 'HT' || f.status === '2H' ? (
                  <span style={{
                    background: '#dc2626', color: '#fff', padding: '2px 10px',
                    borderRadius: '12px', fontSize: '11.5px', fontWeight: '600',
                  }}>LIVE</span>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {f.time ? f.time.slice(0, 5) : '—'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
