import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { AppHeader } from './AppHeader.js';
import { LoadingSpinner } from '../common/LoadingSpinner.js';

export function PatientLayout({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab?: 'wellness' | 'timeline' | 'doctors' | 'appointments' | 'account' | 'companion' | 'records';
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingSpinner message="Verifying session..." size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AppHeader />

      {/* Patient Subnav */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 0',
        }}
      >
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: '#073a78',
                textTransform: 'uppercase',
              }}
            >
              Patient Care Hub
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <nav style={{ display: 'flex', gap: '8px' }}>
              <NavLink
                to="/wellness"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === 'wellness' ? 700 : 500,
                  color: activeTab === 'wellness' ? '#096ed3' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeTab === 'wellness' ? '#eff6ff' : 'transparent',
                  border: activeTab === 'wellness' ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                ◌ Wellness
              </NavLink>
              <NavLink
                to="/health-timeline"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === 'timeline' ? 700 : 500,
                  color: activeTab === 'timeline' ? '#096ed3' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeTab === 'timeline' ? '#eff6ff' : 'transparent',
                  border: activeTab === 'timeline' ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                ◷ Health Timeline
              </NavLink>
              <NavLink
                to="/doctors"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === 'doctors' ? 700 : 500,
                  color: activeTab === 'doctors' ? '#096ed3' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeTab === 'doctors' ? '#eff6ff' : 'transparent',
                  border: activeTab === 'doctors' ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                ⚕ Find Doctors
              </NavLink>
              <NavLink
                to="/appointments"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === 'appointments' ? 700 : 500,
                  color: activeTab === 'appointments' ? '#096ed3' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeTab === 'appointments' ? '#eff6ff' : 'transparent',
                  border: activeTab === 'appointments' ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                📅 Appointments
              </NavLink>
              <NavLink
                to="/health-records"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === 'records' ? 700 : 500,
                  color: activeTab === 'records' ? '#096ed3' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: activeTab === 'records' ? '#eff6ff' : 'transparent',
                  border: activeTab === 'records' ? '1px solid #bfdbfe' : '1px solid transparent',
                  textDecoration: 'none',
                }}
              >
                📁 Health Records
              </NavLink>
            </nav>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
          >
            Non-diagnostic & supportive care layer
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="wrap" style={{ padding: '24px 0 60px' }}>
        {children}
      </main>
    </div>
  );
}
