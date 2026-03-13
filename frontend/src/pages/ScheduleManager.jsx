import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TRANSITIONS = ['fade', 'slide', 'slide-up', 'zoom', 'none'];

const BLANK = {
  name: '', start_time: '08:00', end_time: '18:00',
  days: [0,1,2,3,4,5,6], media_ids: [], transition: 'fade',
  slide_duration: 8, is_active: true,
};

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [media, setMedia] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([api.get('/schedules'), api.get('/media')]);
    setSchedules(s.data);
    setMedia(m.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditItem({ ...BLANK, days: [0,1,2,3,4,5,6], media_ids: [] }); setIsNew(true); };
  const openEdit = (s) => { setEditItem({ ...s }); setIsNew(false); };

  const save = async () => {
    try {
      if (isNew) {
        await api.post('/schedules', editItem);
      } else {
        await api.put(`/schedules/${editItem.id}`, editItem);
      }
      setEditItem(null);
      toast(isNew ? 'Schedule created' : 'Schedule updated');
      load();
    } catch (e) {
      toast(e.response?.data?.error || 'Save failed');
    }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    await api.delete(`/schedules/${id}`);
    toast('Deleted');
    load();
  };

  const toggleActive = async (s) => {
    await api.put(`/schedules/${s.id}`, { ...s, is_active: !s.is_active });
    load();
  };

  const set = (key, val) => setEditItem(e => ({ ...e, [key]: val }));

  const toggleDay = (day) => {
    const days = editItem.days.includes(day)
      ? editItem.days.filter(d => d !== day)
      : [...editItem.days, day].sort();
    set('days', days);
  };

  const toggleMedia = (id) => {
    const ids = editItem.media_ids.includes(id)
      ? editItem.media_ids.filter(x => x !== id)
      : [...editItem.media_ids, id];
    set('media_ids', ids);
  };

  const mediaMap = Object.fromEntries(media.map(m => [m.id, m]));

  return (
    <div style={{ padding: '28px' }}>
      {toastMsg && (
        <div className="toast-container">
          <div className="toast toast-success">{toastMsg}</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Schedules</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Show specific content at specific times
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Schedule</button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗓️</div>
          <h3>No schedules yet</h3>
          <p>Create a schedule to show specific content at certain times of day</p>
          <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={openNew}>Create Schedule</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schedules.map(s => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px' }}>
              {/* Active toggle */}
              <label className="toggle" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={s.is_active} onChange={() => toggleActive(s)} />
                <span className="toggle-slider" />
              </label>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
                  <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {s.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>🕐 {s.start_time} – {s.end_time}</span>
                  <span>📅 {s.days.map(d => DAYS[d]).join(', ')}</span>
                  <span>🖼️ {s.media_ids.length} item{s.media_ids.length !== 1 ? 's' : ''}</span>
                  <span>✨ {s.transition}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{isNew ? 'New Schedule' : 'Edit Schedule'}</div>

            <div className="form-group">
              <label>Schedule Name</label>
              <input value={editItem.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Morning Playlist" />
            </div>

            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Time</label>
                <input type="time" value={editItem.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Time</label>
                <input type="time" value={editItem.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>

            {/* Days */}
            <div className="form-group">
              <label>Active Days</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <button
                    key={i} type="button"
                    onClick={() => toggleDay(i)}
                    style={{
                      padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '500',
                      background: editItem.days.includes(i) ? 'var(--accent)' : 'var(--surface2)',
                      color: editItem.days.includes(i) ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${editItem.days.includes(i) ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Transition</label>
                <select value={editItem.transition} onChange={e => set('transition', e.target.value)}>
                  {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Slide Duration (s)</label>
                <input type="number" min="1" max="300" value={editItem.slide_duration}
                  onChange={e => set('slide_duration', Number(e.target.value))} />
              </div>
            </div>

            {/* Media picker */}
            <div className="form-group">
              <label>Media ({editItem.media_ids.length} selected)</label>
              {media.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                  No media uploaded yet. Go to Media Library first.
                </div>
              ) : (
                <div style={{
                  maxHeight: '200px', overflowY: 'auto',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '6px',
                  padding: '8px'
                }}>
                  {media.map(m => (
                    <div
                      key={m.id}
                      onClick={() => toggleMedia(m.id)}
                      style={{
                        position: 'relative', aspectRatio: '16/9', cursor: 'pointer',
                        borderRadius: '4px', overflow: 'hidden',
                        border: `2px solid ${editItem.media_ids.includes(m.id) ? 'var(--accent)' : 'transparent'}`,
                        opacity: editItem.media_ids.includes(m.id) ? 1 : 0.5,
                        transition: 'all 0.15s',
                      }}
                    >
                      {m.type === 'image'
                        ? <img src={`/uploads/${m.filename}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <video src={`/uploads/${m.filename}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      }
                      {editItem.media_ids.includes(m.id) && (
                        <div style={{
                          position: 'absolute', top: '2px', right: '2px',
                          background: 'var(--accent)', color: '#fff', borderRadius: '50%',
                          width: '16px', height: '16px', fontSize: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700'
                        }}>✓</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>
                {isNew ? 'Create Schedule' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
