import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Simple inline SVG icons
const Icons = {
  Automation: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M8.5 1.5L3 8.5h4l-1 5 5.5-7h-4l1-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
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
  { to: '/admin/media',        label: 'Media Library',  Icon: Icons.Media },
  { to: '/admin/settings',     label: 'Slideshow',      Icon: Icons.Settings },
  { to: '/admin/schedules',    label: 'Schedules',      Icon: Icons.Schedule },
  { to: '/admin/automations',  label: 'Automations',    Icon: Icons.Automation },
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
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--sidebar-border)' }}>
          <img src="/logo-white.svg" alt="Screenifi" style={{ height: '44px', display: 'block', width: '100%', objectFit: 'contain', objectPosition: 'left' }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--sidebar-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>
            Management
          </div>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              marginBottom: '1px', fontSize: '13px', fontWeight: '500',
              color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
              transition: 'all 0.12s',
            })}>
              {({ isActive }) => (
                <>
                  <span style={{ opacity: isActive ? 1 : 0.6 }}><Icon /></span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Open Display */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={openDisplay}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '7px', fontSize: '12.5px', fontWeight: '500',
              background: 'rgba(47,128,237,0.15)', color: 'var(--sidebar-active-text)',
              border: '1px solid rgba(47,128,237,0.25)', borderRadius: 'var(--radius-sm)',
              padding: '7px 14px', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(47,128,237,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(47,128,237,0.15)'}
          >
            <Icons.Display /> Open Display
          </button>
        </div>

        {/* User */}
        <div style={{
          padding: '12px 14px', borderTop: '1px solid var(--sidebar-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--sidebar-text)' }}>{user?.username}</div>
            <div style={{ fontSize: '11px', color: 'var(--sidebar-muted)' }}>Administrator</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              padding: '5px 7px', background: 'transparent',
              color: 'var(--sidebar-muted)', border: '1px solid var(--sidebar-border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--sidebar-text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-muted)'; e.currentTarget.style.borderColor = 'var(--sidebar-border)'; }}
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
