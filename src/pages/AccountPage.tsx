import { PatientLayout } from '../components/layout/PatientLayout.js';
import { useAuth } from '../context/AuthContext.js';

export function AccountPage() {
  const { user } = useAuth();

  return (
    <PatientLayout activeTab="account">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="eyebrow">PHASE 2 — PATIENT PROFILE</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 16px', color: '#073a78' }}>
          Account & Profile
        </h1>

        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'grid', gap: '14px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                Patient ID
              </span>
              <span style={{ fontWeight: 600, color: '#073a78', fontFamily: 'monospace' }}>
                {user?.id || 'pat-demo-001'}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                Email Address
              </span>
              <span style={{ fontWeight: 600, color: '#073a78' }}>
                {user?.email || 'patient.demo@manvia.health'}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                Authorized Role
              </span>
              <span
                style={{
                  display: 'inline-block',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginTop: '2px',
                }}
              >
                {user?.roles?.[0] || 'PATIENT'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
