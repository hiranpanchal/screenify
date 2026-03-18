import { useState, useEffect } from 'react';
import api from '../api/client';

const TRANSITIONS = [
  { value: 'fade',     label: 'Fade',       desc: 'Smooth cross-fade between slides' },
  { value: 'slide',    label: 'Slide Left',  desc: 'Slides enter from the right' },
  { value: 'slide-up', label: 'Slide Up',    desc: 'Slides enter from the bottom' },
  { value: 'zoom',     label: 'Zoom In',     desc: 'Subtle zoom-in on each slide' },
  { value: 'none',     label: 'Cut',         desc: 'Instant switch, no animation' },
];

export default function SlideshowSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/settings').then(r => setSettings(r.data)); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  if (!settings) return (
    <div style={{ padding: '28px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
  );

  return (
    <div style={{ padding: '28px', maxWidth: '660px' }}>
      <div className="page-header" style={{ display: 'block', border: 'none', paddingBottom: 0, marginBottom: '24px' }}>
        <div className="page-title">Slideshow Settings</div>
        <div className="page-subtitle">Default configuration applied when no schedule is active</div>
      </div>

      {/* Timing */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Timing
        </div>

        <div className="form-group">
          <label>Default slide duration</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range" min="1" max="120" step="1"
              value={settings.default_duration || 8}
              onChange={e => set('default_duration', e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{
              minWidth: '52px', textAlign: 'center',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '5px 8px',
              fontSize: '13px', fontWeight: '600',
            }}>
              {settings.default_duration || 8}s
            </div>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
            Per-image duration can be overridden in the Media Library. Videos play their full length.
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0, marginTop: '12px' }}>
          <label>Transition speed</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range" min="100" max="2000" step="100"
              value={settings.transition_speed || 800}
              onChange={e => set('transition_speed', e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{
              minWidth: '52px', textAlign: 'center',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '5px 8px',
              fontSize: '13px', fontWeight: '600',
            }}>
              {settings.transition_speed || 800}ms
            </div>
          </div>
        </div>
      </div>

      {/* Transitions */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Transition Effect
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {TRANSITIONS.map(t => (
            <div
              key={t.value}
              onClick={() => set('transition', t.value)}
              style={{
                padding: '11px 13px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: `1px solid ${settings.transition === t.value ? 'var(--accent)' : 'var(--border)'}`,
                background: settings.transition === t.value ? 'var(--accent-light)' : 'var(--surface2)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                fontSize: '12.5px', fontWeight: '600',
                color: settings.transition === t.value ? 'var(--accent-hover)' : 'var(--text)',
                marginBottom: '2px',
              }}>
                {t.label}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Playback */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Playback
        </div>

        {[
          { key: 'loop',          label: 'Loop Playlist',     desc: 'Restart from the beginning when the playlist ends' },
          { key: 'shuffle',       label: 'Shuffle',           desc: 'Randomize media order on each loop' },
          { key: 'show_progress', label: 'Progress Bar',      desc: 'Show a thin progress bar at the bottom of the screen' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <label className="toggle" style={{ marginLeft: '16px' }}>
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

      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '9px 20px' }}>
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
