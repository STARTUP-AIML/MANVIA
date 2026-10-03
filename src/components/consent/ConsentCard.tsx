import type { ConsentResponseDto } from '../../types/healthRecords.js';
import { CONSENT_SCOPE_LABELS, CONSENT_SCOPE_DESCRIPTIONS } from '../../types/healthRecords.js';

interface ConsentCardProps {
  consent: ConsentResponseDto;
  onRevoke: (consent: ConsentResponseDto) => void;
  onViewHistory: (consent: ConsentResponseDto) => void;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return 'None (Until revoked)';
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function ConsentCard({ consent, onRevoke, onViewHistory }: ConsentCardProps) {
  const isRevoked = consent.status === 'REVOKED';
  const isActive = consent.isCurrentlyActive && consent.status === 'ACTIVE';

  return (
    <article
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(7, 58, 120, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        {/* Top row: Doctor name & status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
              {consent.doctorDisplayName}
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#64748b',
                background: '#f8fafc',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
              }}
            >
              {consent.publicDoctorId}
            </span>
          </div>

          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isActive ? '#ecfdf5' : isRevoked ? '#f1f5f9' : '#fffbeb',
              color: isActive ? '#059669' : isRevoked ? '#64748b' : '#b45309',
              border: `1px solid ${isActive ? '#a7f3d0' : isRevoked ? '#cbd5e1' : '#fde68a'}`,
            }}
          >
            {isActive ? '● Active Access' : isRevoked ? 'Revoked' : 'Expired'}
          </span>
        </div>

        {/* Scope info */}
        <div style={{ margin: '12px 0 10px' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              marginBottom: '6px',
            }}
          >
            Scope: {CONSENT_SCOPE_LABELS[consent.scope] || consent.scope}
          </div>
          <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0', lineHeight: 1.45 }}>
            {CONSENT_SCOPE_DESCRIPTIONS[consent.scope] || 'Access to specified clinical resource.'}
          </p>
        </div>

        {/* Purpose */}
        {consent.purpose && (
          <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0', fontStyle: 'italic' }}>
            " {consent.purpose} "
          </p>
        )}

        {/* Dates */}
        <div style={{ fontSize: '11px', color: '#64748b', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div>Granted: <strong>{formatDate(consent.grantedAt)}</strong></div>
          <div>Expires: <strong>{formatDate(consent.expiresAt)}</strong></div>
          {consent.revokedAt && (
            <div style={{ color: '#dc2626' }}>
              Revoked on: <strong>{formatDate(consent.revokedAt)}</strong>
              {consent.revocationReason ? ` (${consent.revocationReason})` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '12px',
          marginTop: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => onViewHistory(consent)}
          style={{
            background: 'none',
            border: 0,
            color: '#096ed3',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>📜</span> View Audit Trail
        </button>

        {isActive && (
          <button
            type="button"
            onClick={() => onRevoke(consent)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#dc2626',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Revoke Access
          </button>
        )}
      </div>
    </article>
  );
}
