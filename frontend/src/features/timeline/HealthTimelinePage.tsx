import { TimelineFeed } from '@/features/timeline/components/TimelineFeed';

export function HealthTimelinePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        maxWidth: '1120px',
        margin: '0 auto',
      }}
      data-testid="health-timeline-page"
    >
      <div style={{ marginBottom: '24px' }}>
        <div className="eyebrow">PHASE 5 ENGINE</div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '6px 0 4px', color: '#073a78' }}>
          Longitudinal Health Timeline
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Chronological record of your wellness check-ins, lab records, consultations, and care events.
        </p>
      </div>

      {/* Main Timeline Feed */}
      <TimelineFeed />

      {/* Privacy Notice */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        <strong>Privacy & Security Notice:</strong> Health Timeline entries are secured using end-to-end patient authorization. Event summaries and metadata contain non-sensitive attributes for navigation and clinical auditability. Physician access requires explicit, active consent with the HEALTH_TIMELINE scope.
      </div>
    </div>
  );
}
