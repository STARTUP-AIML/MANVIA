import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { usePatientProfileQuery } from '@/features/patient';

export function AccountPage() {
  const { user, logout } = useAuth();
  const { data: profile } = usePatientProfileQuery();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}
      data-testid="account-page"
    >
      <div>
        <div className="eyebrow">PATIENT ACCOUNT</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 8px', color: '#073a78' }}>
          Account & Profile
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Authenticated identity credentials, public patient identifier, and security options.
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              Public Patient ID
            </span>
            <span style={{ fontWeight: 600, color: '#073a78', fontFamily: 'monospace' }}>
              {profile?.publicPatientId || 'Profile not initialized'}
            </span>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              Authenticated Email
            </span>
            <span style={{ fontWeight: 600, color: '#073a78' }}>
              {user?.email || '—'}
            </span>
          </div>

          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
              Authorized Roles
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {(user?.roles || ['PATIENT']).map((role) => (
                <span
                  key={role}
                  style={{
                    display: 'inline-block',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Navigation & Actions */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          Account Actions
        </h2>

        <Link
          to="/app/profile"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: '#0f172a',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <span>Edit Patient Profile</span>
          <span style={{ color: '#64748b' }}>&rarr;</span>
        </Link>

        <Link
          to="/app/settings"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            textDecoration: 'none',
            color: '#0f172a',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <span>Preferences & Security Settings</span>
          <span style={{ color: '#64748b' }}>&rarr;</span>
        </Link>

        <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #fecdd3',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign Out of MANVIA
          </button>
        </div>
      </div>
    </div>
  );
}
