import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TRANSITIONS = ['fade', 'slide', 'slide-up', 'zoom', 'none'];

const BLANK = {
  name: '', start_time: '08:00', end_time: '18:00',
  days: [0,1,2,3,4,5,6], media_ids: [], transition: 'fade',
  slide_duration: 8, is_active: true,
};

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 3h9M4 3V2a1 1 0 011-1h2a1 1 0 011 1v1M10 3l-.75 7.5A1 1 0 018.26 11H3.74a1 1 0 01-.99-.9L2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState([]);
  const [media, setMedia] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const load = useCallback(async () => {
    const [s, m] = await Promise.all([api.get('/schedules'), api.get('/media')]);
    setSchedules(s.data); setMedia(m.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setEditItem({ ...BLANK, days: [0,1,2,3,4,5,6], media_ids: [] }); setIsNew(true); };
  const openEdit = (s) => { setEditItem({ ...s }); setIsNew(false); };

  const save = async () => {
    try {
      if (isNew) await api.post('/schedules', editItem);
      else await api.put(`/schedules/${editItem.id}`, editItem);
      setEditItem(null);
      toast(isNew ? 'Schedule created' : 'Schedule updated');
      load();
    } catch (e) { toast(e.response?.data?.error || 'Save failed'); }
  };

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return;
    await api.delete(`/schedules/${id}`);
    toast('Schedule deleted'); load();
  };

  const toggleActive = async (s) => {
    await api.put(`/schedules/${s.id}`, { ...s, is_active: !s.is_active }); load();
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

  return (
    <div style={{ padding: '28px' }}>
      {toastMsg && (
        <div className="toast-container">
          <div className="toast toast-success">{toastMsg}</div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Schedules</div>
          <div className="page-subtitle">Show specific playlists at specific times and days</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <PlusIcon /> New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="var(--text-muted)" strokeWidth="1.4"/>
              <path d="M7 2v3M13 2v3M2.5 8h15" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="10" cy="13" r="2.5" stroke="var(--text-muted)" strokeWidth="1.2"/>
              <path d="M10 11.5v1.7l1 1" stroke="var(--text-muted)" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>No schedules yet</h3>
          <p>Create a schedule to display specific content during certain times or days</p>
          <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={openNew}>
            <PlusIcon /> Create Schedule
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {schedules.map(s => (
            <div key={s.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px'
            }}>
              <label className="toggle">
                <input type="checkbox" checked={s.is_active} onChange={() => toggleActive(s)} />
                <span className="toggle-slider" />
              </label>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{s.name}</span>
                  <span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {s.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span>{s.start_time} – {s.end_time}</span>
                  <span>{s.days.map(d => DAYS[d]).join(', ')}</span>
                  <span>{s.media_ids.length} item{s.media_ids.length !== 1 ? 's' : ''}</span>
                  <span>{s.transition} · {s.slide_duration}s</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                  <EditIcon /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}
                  style={{ padding: '4px 9px' }}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{isNew ? 'New Schedule' : 'Edit Schedule'}</div>

            <div className="form-group">
              <label>Schedule Name</label>
              <input value={editItem.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Morning Playlist" />
            </div>

            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Time</label>
                <input type="time" value={editItem.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Time</label>
                <input type="time" value={editItem.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Active Days</label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)} style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                    fontSize: '12px', fontWeight: '500',
                    background: editItem.days.includes(i) ? 'var(--accent)' : 'var(--surface2)',
                    color: editItem.days.includes(i) ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${editItem.days.includes(i) ? 'var(--accent)' : 'var(--border)'}`,
                  }}>{d}</button>
                ))}
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Transition</label>
                <select value={editItem.transition} onChange={e => set('transition', e.target.value)}>
                  {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Slide Duration (seconds)</label>
                <input type="number" min="1" max="300" value={editItem.slide_duration}
                  onChange={e => set('slide_duration', Number(e.target.value))} />
              </div>
            </div>

            <div className="form-group">
              <label>Media — {editItem.media_ids.length} selected</label>
              {media.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px 0' }}>
                  No media uploaded yet. Go to Media Library first.
                </div>
              ) : (
                <div style={{
                  maxHeight: '190px', overflowY: 'auto',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '5px', padding: '7px',
                }}>
                  {media.map(m => (
                    <div key={m.id} onClick={() => toggleMedia(m.id)} style={{
                      position: 'relative', aspectRatio: '16/9', cursor: 'pointer',
                      borderRadius: '4px', overflow: 'hidden',
                      border: `2px solid ${editItem.media_ids.includes(m.id) ? 'var(--accent)' : 'transparent'}`,
                      opacity: editItem.media_ids.includes(m.id) ? 1 : 0.45,
                      transition: 'all 0.12s',
                    }}>
                      {m.type === 'image'
                        ? <img src={`/uploads/${m.filename}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <video src={`/uploads/${m.filename}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      }
                      {editItem.media_ids.includes(m.id) && (
                        <div style={{
                          position: 'absolute', top: '3px', right: '3px',
                          background: 'var(--accent)', color: '#fff', borderRadius: '3px',
                          width: '15px', height: '15px', fontSize: '9px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
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
