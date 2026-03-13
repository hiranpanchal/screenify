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

function formatDuration(secs) {
  return secs >= 60 ? `${Math.floor(secs/60)}m ${secs%60}s` : `${secs}s`;
}

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
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
      });
      toast(`${files.length} file(s) uploaded`);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    uploadFiles(e.dataTransfer.files);
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.original_name}"?`)) return;
    try {
      await api.delete(`/media/${item.id}`);
      setMedia(m => m.filter(x => x.id !== item.id));
      toast('Deleted');
    } catch { toast('Delete failed', 'error'); }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/media/${editItem.id}`, {
        original_name: editItem.original_name,
        duration: Number(editItem.duration),
      });
      setMedia(m => m.map(x => x.id === editItem.id ? editItem : x));
      setEditItem(null);
      toast('Saved');
    } catch { toast('Save failed', 'error'); }
  };

  // Drag to reorder
  const handleDragStart = (id) => setDragItemId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop_reorder = async (e, targetId) => {
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Media Library</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            {media.length} file{media.length !== 1 ? 's' : ''} — drag to reorder
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
          <span>↑</span> Upload Files
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
          onChange={e => uploadFiles(e.target.files)} />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent-light)' : 'transparent',
          borderRadius: 'var(--radius)', padding: '20px',
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: '13px', marginBottom: '24px',
          transition: 'all 0.15s', cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current.click()}
      >
        {uploading
          ? <><div style={{ marginBottom: '8px' }}>Uploading… {uploadProgress}%</div>
              <div style={{ background: 'var(--border)', borderRadius: '4px', height: '4px' }}>
                <div style={{ background: 'var(--accent)', height: '4px', borderRadius: '4px', width: `${uploadProgress}%`, transition: 'width 0.2s' }} />
              </div></>
          : '📁 Drop images or videos here, or click to browse'
        }
      </div>

      {/* Media grid */}
      {media.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🖼️</div>
          <h3>No media yet</h3>
          <p>Upload images or videos to get started</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          {media.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={e => handleDragOver(e, item.id)}
              onDrop={e => handleDrop_reorder(e, item.id)}
              onDragEnd={() => { setDragItemId(null); setDragOverId(null); }}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${dragOverId === item.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                cursor: 'grab',
                transition: 'border-color 0.15s',
                opacity: dragItemId === item.id ? 0.5 : 1,
              }}
            >
              {/* Preview */}
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#111', overflow: 'hidden' }}>
                {item.type === 'image' ? (
                  <img
                    src={`/uploads/${item.filename}`}
                    alt={item.original_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <video
                    src={`/uploads/${item.filename}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    muted
                  />
                )}
                <div style={{ position: 'absolute', top: '6px', left: '6px' }}>
                  <span className={`badge badge-${item.type}`}>
                    {item.type === 'video' ? '🎬' : '🖼️'} {item.type}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <div style={{
                  fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px'
                }} title={item.original_name}>
                  {item.original_name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatSize(item.size)}</span>
                  {item.type === 'image' && <span>⏱ {formatDuration(item.duration || 8)}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '0 10px 10px', display: 'flex', gap: '6px' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                  onClick={() => setEditItem({ ...item })}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item)}>🗑</button>
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
                <input
                  type="number" min="1" max="300"
                  value={editItem.duration || 8}
                  onChange={e => setEditItem(x => ({ ...x, duration: e.target.value }))}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  How long this image stays on screen (overrides global setting)
                </small>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
