import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

export function Logo() {
  return (
    <Link to="/" className="logo">
      <div className="logo-badge">
        <img src="/manvia-logo-mark.png" alt="MANVIA Logo" className="logo-img" />
      </div>
      <div>
        <div className="logo-name">MANVIA</div>
        <div className="logo-tag">Care made simpler</div>
      </div>
    </Link>
  );
}

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="header">
      <Logo />
      <button
        className="mobile-menu"
        onClick={() => setOpen(!open)}
        aria-label="Open menu"
        type="button"
      >
        ☰
      </button>

      <nav className={`nav ${open ? 'open' : ''}`}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'active-nav' : '')}
          onClick={() => setOpen(false)}
        >
          Home
        </NavLink>
        {isAuthenticated && (
          <>
            <NavLink
              to="/wellness"
              className={({ isActive }) => (isActive ? 'active-nav' : '')}
              onClick={() => setOpen(false)}
            >
              Wellness
            </NavLink>
            <NavLink
              to="/health-timeline"
              className={({ isActive }) => (isActive ? 'active-nav' : '')}
              onClick={() => setOpen(false)}
            >
              Health Timeline
            </NavLink>
            <NavLink
              to="/doctors"
              className={({ isActive }) => (isActive ? 'active-nav' : '')}
              onClick={() => setOpen(false)}
            >
              Doctors
            </NavLink>
            <NavLink
              to="/appointments"
              className={({ isActive }) => (isActive ? 'active-nav' : '')}
              onClick={() => setOpen(false)}
            >
              Appointments
            </NavLink>
          </>
        )}
        <NavLink
          to="/ai-companion"
          className={({ isActive }) => (isActive ? 'active-nav' : '')}
          onClick={() => setOpen(false)}
        >
          AI Companion
        </NavLink>
        {isAuthenticated && (
          <NavLink
            to="/account"
            className={({ isActive }) => (isActive ? 'active-nav' : '')}
            onClick={() => setOpen(false)}
          >
            Account
          </NavLink>
        )}
      </nav>

      <div className="header-actions">
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#073a78',
                background: '#e0f2fe',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
              }}
            >
              {user?.email || 'Patient'}
            </span>
            <button
              type="button"
              className="outline"
              style={{ padding: '7px 14px', fontSize: '11px' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button type="button" className="login" onClick={() => navigate('/login')}>
              Login
            </button>
            <button
              type="button"
              className="primary small"
              onClick={() => navigate('/login')}
            >
              Get Started <span>→</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
