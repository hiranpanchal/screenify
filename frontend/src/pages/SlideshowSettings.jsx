import { useState, useEffect } from 'react';
import api from '../api/client';

const TRANSITIONS = [
  { value: 'fade',      label: 'Fade',         desc: 'Smooth cross-fade between slides' },
  { value: 'slide',     label: 'Slide Left',    desc: 'Slide from right to left' },
  { value: 'slide-up',  label: 'Slide Up',      desc: 'Slide from bottom to top' },
  { value: 'zoom',      label: 'Zoom In',       desc: 'Subtle zoom-in effect' },
  { value: 'none',      label: 'None (Cut)',    desc: 'Instant cut with no animation' },
];

export default function SlideshowSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  if (!settings) return (
    <div style={{ padding: '28px', color: 'var(--text-muted)' }}>Loading…</div>
  );

  return (
    <div style={{ padding: '28px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Slideshow Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
          Default settings applied when no schedule is active
        </p>
      </div>

      {/* Duration */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>⏱ Slide Timing</h3>
        <div className="form-group">
          <label>Default slide duration (seconds)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range" min="1" max="120" step="1"
              value={settings.default_duration || 8}
              onChange={e => set('default_duration', e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', padding: 0, accentColor: 'var(--accent)' }}
            />
            <span style={{
              minWidth: '52px', textAlign: 'center',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: '14px', fontWeight: '600'
            }}>
              {settings.default_duration || 8}s
            </span>
          </div>
          <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            Per-image durations can be set in Media Library. Videos always play their full length.
          </small>
        </div>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label>Transition speed (ms)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range" min="100" max="2000" step="100"
              value={settings.transition_speed || 800}
              onChange={e => set('transition_speed', e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', padding: 0, accentColor: 'var(--accent)' }}
            />
            <span style={{
              minWidth: '52px', textAlign: 'center',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: '14px', fontWeight: '600'
            }}>
              {settings.transition_speed || 800}ms
            </span>
          </div>
        </div>
      </div>

      {/* Transitions */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>✨ Transition Effect</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {TRANSITIONS.map(t => (
            <div
              key={t.value}
              onClick={() => set('transition', t.value)}
              style={{
                padding: '12px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: `2px solid ${settings.transition === t.value ? 'var(--accent)' : 'var(--border)'}`,
                background: settings.transition === t.value ? 'var(--accent-light)' : 'var(--surface2)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600', color: settings.transition === t.value ? 'var(--accent-hover)' : 'var(--text)' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Playback options */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>🔁 Playback</h3>

        {[
          { key: 'loop',          label: 'Loop Playlist',     desc: 'Restart from beginning when finished' },
          { key: 'shuffle',       label: 'Shuffle Order',     desc: 'Randomize media order each loop' },
          { key: 'show_progress', label: 'Show Progress Bar', desc: 'Display a thin progress bar at bottom of screen' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings[key] === true || settings[key] === 'true'}
                onChange={e => set(key, e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '10px 24px' }}>
        {saving ? 'Saving…' : saved ? '✅ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
