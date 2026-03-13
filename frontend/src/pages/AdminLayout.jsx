import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/admin/media',     label: 'Media Library',   icon: '🖼️' },
  { to: '/admin/settings',  label: 'Slideshow',        icon: '⚙️' },
  { to: '/admin/schedules', label: 'Schedules',        icon: '🗓️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const openDisplay = () => {
    window.open('/display', '_blank', 'noopener');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '0',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📺</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.3px' }}>Screenify</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digital Signage</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: 'var(--radius-sm)',
              marginBottom: '2px', fontSize: '13px', fontWeight: '500',
              color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: '16px' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Display link */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={openDisplay}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
          >
            <span>🖥️</span> Open Display
          </button>
        </div>

        {/* User */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>{user?.username}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Logout">
            ↩
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
