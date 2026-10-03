import type { ConsentResponseDto } from '../../types/healthRecords.js';
import { CONSENT_SCOPE_LABELS } from '../../types/healthRecords.js';
import { useConsentDetail } from '../../hooks/useHealthRecords.js';
import { LoadingSpinner } from '../common/LoadingSpinner.js';
import { ErrorAlert } from '../common/ErrorAlert.js';

interface ConsentAuditHistoryModalProps {
  consent: ConsentResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function ConsentAuditHistoryModal({ consent, isOpen, onClose }: ConsentAuditHistoryModalProps) {
  const { data, isLoading, error } = useConsentDetail(consent?.id || '', isOpen && Boolean(consent));

  if (!isOpen || !consent) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 58, 120, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          padding: '24px 28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <h2 id="audit-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#073a78', margin: 0 }}>
              Consent Audit History
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              {consent.doctorDisplayName} • {CONSENT_SCOPE_LABELS[consent.scope] || consent.scope}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {isLoading && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <LoadingSpinner message="Retrieving immutable audit history..." size="medium" />
            </div>
          )}

          {error && (
            <div style={{ padding: '16px 0' }}>
              <ErrorAlert
                title="Audit Trail Unavailable"
                message={error instanceof Error ? error.message : 'Could not fetch audit events.'}
              />
            </div>
          )}

          {!isLoading && !error && data && (
            <div>
              {data.history.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                  No historical actions logged for this consent record.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                  {data.history.map((event, idx) => {
                    const isGranted = event.action === 'GRANTED';
                    const isRevoked = event.action === 'REVOKED';

                    return (
                      <div
                        key={event.id || idx}
                        style={{
                          borderLeft: `3px solid ${isGranted ? '#22c55e' : isRevoked ? '#ef4444' : '#3b82f6'}`,
                          paddingLeft: '14px',
                          paddingBottom: '2px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isGranted ? '#ecfdf5' : isRevoked ? '#fef2f2' : '#eff6ff',
                              color: isGranted ? '#059669' : isRevoked ? '#dc2626' : '#2563eb',
                            }}
                          >
                            {event.action}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {formatDate(event.createdAt)}
                          </span>
                        </div>

                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#1e293b' }}>
                          Actor: <strong>{event.actorRole}</strong>
                          {event.reason && (
                            <span style={{ color: '#475569', display: 'block', marginTop: '2px' }}>
                              Reason: {event.reason}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
