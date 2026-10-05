import { PatientLayout } from '@/components/layout/PatientLayout';

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
              lineHeight: 1.6,
              marginBottom: '20px',
            }}
          >
            Welcome! How can I support your health journey today? You can discuss wellness routines, review evidence-based guidance, or ask for help finding the right doctor.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href="/app/ai"
              className="button primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#096ed3',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open Interactive Companion Chat ↗
            </a>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
