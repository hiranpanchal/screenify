import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Simple inline SVG icons
const Icons = {
  Media: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 10.5l3-3 2.5 2.5 2-2 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.06 1.06M11.04 11.04l1.06 1.06M2.9 12.1l1.06-1.06M11.04 3.96l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Schedule: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 1v3M10 1v3M1.5 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7.5" cy="9.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7.5 8.5v1.2l.7.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  ),
  Display: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 13h5M7.5 11v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Logout: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2H2.5A1.5 1.5 0 001 3.5v7A1.5 1.5 0 002.5 12H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9.5 10L13 7l-3.5-3M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const NAV = [
  { to: '/admin/media',     label: 'Media Library',  Icon: Icons.Media },
  { to: '/admin/settings',  label: 'Slideshow',       Icon: Icons.Settings },
  { to: '/admin/schedules', label: 'Schedules',       Icon: Icons.Schedule },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const openDisplay = () => window.open('/display', '_blank', 'noopener');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="white" strokeWidth="1.5"/>
                <path d="M5 14h6M8 12v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '-0.3px' }}>Screenify</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-subtle)' }}>Digital Signage</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>
            Management
          </div>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              marginBottom: '1px', fontSize: '13px', fontWeight: '500',
              color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.12s',
            })}>
              {({ isActive }) => (
                <>
                  <span style={{ opacity: isActive ? 1 : 0.7 }}><Icon /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Open Display */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={openDisplay}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', gap: '7px', fontSize: '12.5px' }}
          >
            <Icons.Display /> Open Display
          </button>
        </div>

        {/* User */}
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: '600' }}>{user?.username}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>Administrator</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            title="Sign out"
            style={{ padding: '5px 7px' }}
          >
            <Icons.Logout />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
