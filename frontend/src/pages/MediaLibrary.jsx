import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v9M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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

export default function MediaLibrary() {
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragItemId, setDragItemId] = useState(null);
  const fileInputRef = useRef();

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const load = useCallback(async () => {
    const res = await api.get('/media');
    setMedia(res.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true); setUploadProgress(0);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      toast(`${files.length} file(s) uploaded`);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Upload failed', 'error');
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.original_name}"?`)) return;
    try {
      await api.delete(`/media/${item.id}`);
      setMedia(m => m.filter(x => x.id !== item.id));
      toast('File deleted');
    } catch { toast('Delete failed', 'error'); }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/media/${editItem.id}`, {
        original_name: editItem.original_name,
        duration: Number(editItem.duration),
      });
      setMedia(m => m.map(x => x.id === editItem.id ? { ...x, ...editItem } : x));
      setEditItem(null);
      toast('Changes saved');
    } catch { toast('Save failed', 'error'); }
  };

  const handleDragStart = (id) => setDragItemId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDropReorder = async (e, targetId) => {
    e.preventDefault();
    if (dragItemId === targetId) { setDragItemId(null); setDragOverId(null); return; }
    const items = [...media];
    const fromIdx = items.findIndex(x => x.id === dragItemId);
    const toIdx = items.findIndex(x => x.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setMedia(items);
    setDragItemId(null); setDragOverId(null);
    try {
      await api.put('/media/reorder/bulk', { order: items.map(x => x.id) });
    } catch { toast('Reorder failed', 'error'); load(); }
  };

  return (
    <div style={{ padding: '28px' }}>
      <Toast toasts={toasts} />

      <div className="page-header">
        <div>
          <div className="page-title">Media Library</div>
          <div className="page-subtitle">
            {media.length} file{media.length !== 1 ? 's' : ''} — drag cards to reorder
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
          <UploadIcon /> Upload Files
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*"
          style={{ display: 'none' }} onChange={e => uploadFiles(e.target.files)} />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent-light)' : 'var(--surface)',
          borderRadius: 'var(--radius)', padding: '48px 18px',
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: '13.5px', marginBottom: '24px',
          transition: 'all 0.15s', cursor: 'pointer',
        }}
      >
        {uploading
          ? (
            <>
              <div style={{ marginBottom: '8px', fontSize: '12.5px' }}>Uploading… {uploadProgress}%</div>
              <div style={{ background: 'var(--border)', borderRadius: '4px', height: '3px', maxWidth: '240px', margin: '0 auto' }}>
                <div style={{ background: 'var(--accent)', height: '3px', borderRadius: '4px', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
              </div>
            </>
          )
          : (
            <>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: '10px', opacity: 0.4 }}>
                <path d="M16 20V10M12 14l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22a5 5 0 01-.5-9.95A7 7 0 1123 16h1a4 4 0 010 8H9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Drop images or videos here</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>or click to browse your files</div>
            </>
          )
        }
      </div>

      {/* Grid */}
      {media.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="16" height="16" rx="2" stroke="var(--text-muted)" strokeWidth="1.4"/>
              <circle cx="7" cy="7" r="2" stroke="var(--text-muted)" strokeWidth="1.3"/>
              <path d="M2.5 14l4-4 3 3 2.5-2.5 5 5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No media uploaded yet</h3>
          <p>Upload images or videos to build your slideshow</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {media.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={e => handleDragOver(e, item.id)}
              onDrop={e => handleDropReorder(e, item.id)}
              onDragEnd={() => { setDragItemId(null); setDragOverId(null); }}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${dragOverId === item.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', overflow: 'hidden',
                cursor: 'grab', transition: 'border-color 0.15s',
                opacity: dragItemId === item.id ? 0.45 : 1,
              }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#e8eaf1', overflow: 'hidden' }}>
                {item.type === 'image'
                  ? <img src={`/uploads/${item.filename}`} alt={item.original_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <video src={`/uploads/${item.filename}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                }
                <div style={{ position: 'absolute', top: '7px', left: '7px' }}>
                  <span className={`badge badge-${item.type}`}>{item.type}</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px 4px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px',
                }} title={item.original_name}>
                  {item.original_name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatSize(item.size)}</span>
                  {item.type === 'image' && <span>{item.duration || 8}s per slide</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '6px 10px 10px', display: 'flex', gap: '5px' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setEditItem({ ...item })}>
                  <EditIcon /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item)}
                  style={{ padding: '4px 9px' }}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Edit Media</div>
            <div className="form-group">
              <label>Display Name</label>
              <input
                value={editItem.original_name}
                onChange={e => setEditItem(x => ({ ...x, original_name: e.target.value }))}
              />
            </div>
            {editItem.type === 'image' && (
              <div className="form-group">
                <label>Slide Duration (seconds)</label>
                <input type="number" min="1" max="300"
                  value={editItem.duration || 8}
                  onChange={e => setEditItem(x => ({ ...x, duration: e.target.value }))}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Overrides the global default. Videos always play their full duration.
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
