import React, { useState } from 'react';
import type { ConsentResponseDto } from '../../types/healthRecords.js';
import { CONSENT_SCOPE_LABELS } from '../../types/healthRecords.js';
import { useRevokeConsent } from '../../hooks/useHealthRecords.js';
import { ErrorAlert } from '../common/ErrorAlert.js';

interface RevokeConsentModalProps {
  consent: ConsentResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RevokeConsentModal({ consent, isOpen, onClose, onSuccess }: RevokeConsentModalProps) {
  const [reason, setReason] = useState('Consultation completed; access no longer needed');
  const revokeMutation = useRevokeConsent();

  if (!isOpen || !consent) return null;

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await revokeMutation.mutateAsync({
        id: consent.id,
        dto: { reason: reason.trim() || undefined },
      });
      onSuccess?.();
      onClose();
    } catch {
      // Handled via mutation error state
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-modal-title"
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
          maxWidth: '480px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <h2 id="revoke-modal-title" style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Revoke Physician Access?
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              {consent.doctorDisplayName} ({consent.publicDoctorId})
            </p>
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '12px',
            color: '#334155',
          }}
        >
          <strong>Revoking Scope:</strong> {CONSENT_SCOPE_LABELS[consent.scope] || consent.scope}
        </div>

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
          This will immediately stop future physician access under this consent grant. In accordance with healthcare privacy standards, past consultations and clinical documentation completed under authorized care remain safely logged.
        </p>

        {revokeMutation.error && (
          <div style={{ marginBottom: '14px' }}>
            <ErrorAlert
              title="Revocation Failed"
              message={revokeMutation.error instanceof Error ? revokeMutation.error.message : 'Unable to revoke consent.'}
            />
          </div>
        )}

        <form onSubmit={handleRevoke}>
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="revoke-reason"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Reason for Revocation (Optional)
            </label>
            <input
              id="revoke-reason"
              type="text"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={revokeMutation.isPending}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={revokeMutation.isPending}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: revokeMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Keep Access
            </button>
            <button
              type="submit"
              disabled={revokeMutation.isPending}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 0,
                backgroundColor: '#dc2626',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: revokeMutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              }}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
