import { PatientLayout } from '../components/layout/PatientLayout.js';

export function AICompanionPage() {
  return (
    <PatientLayout activeTab="companion">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div className="eyebrow">PHASE 4 — AI COMPANION</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '6px 0 8px', color: '#073a78' }}>
          AI Health Companion
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>
          Supportive text chat connected to MANVIA's clinical intelligence layer.
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center',
                fontSize: '18px',
              }}
            >
              ✦
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#073a78' }}>MANVIA AI Companion</div>
              <div style={{ fontSize: '11px', color: '#16a34a' }}>● Online & Supportive</div>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#334155',
              lineHeight: 1.5,
              marginBottom: '16px',
            }}
          >
            Hello! How can I support your health journey today? You can log daily wellness check-ins or review your health timeline events anytime.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Type your message..."
              disabled
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: '#f8fafc',
              }}
            />
            <button
              type="button"
              disabled
              className="primary small"
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            >
              Send ↗
            </button>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
