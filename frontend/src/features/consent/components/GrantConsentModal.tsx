import { useState } from 'react';
import type { ConsentScope } from '@/types/healthRecords';
import { CONSENT_SCOPE_LABELS, CONSENT_SCOPE_DESCRIPTIONS } from '@/types/healthRecords';
import { useGrantConsent } from '@/hooks/useHealthRecords';
import { useDoctors } from '@/hooks/useDoctors';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface GrantConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialDoctorId?: string;
}

export function GrantConsentModal({
  isOpen,
  onClose,
  onSuccess,
  initialDoctorId,
}: GrantConsentModalProps) {
  const { data: doctorsData } = useDoctors();
  const [doctorId, setDoctorId] = useState(initialDoctorId || '');
  const [selectedScopes, setSelectedScopes] = useState<ConsentScope[]>(['HEALTH_RECORDS']);
  const [purpose, setPurpose] = useState('Medical consultation and treatment planning');
  const [expiresAt, setExpiresAt] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const grantMutation = useGrantConsent();

  if (!isOpen) return null;

  const toggleScope = (scope: ConsentScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!doctorId.trim()) {
      setValidationError('Please select or specify a physician for this consent.');
      return;
    }

    if (selectedScopes.length === 0) {
      setValidationError('Please select at least one resource scope to grant.');
      return;
    }

    try {
      await grantMutation.mutateAsync({
        doctorId: doctorId.trim(),
        scopes: selectedScopes,
        purpose: purpose.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grant consent.';
      setValidationError(message);
    }
  };

  const allScopes: ConsentScope[] = [
    'HEALTH_RECORDS',
    'HEALTH_TIMELINE',
    'WELLNESS',
    'PRE_CONSULTATION',
    'CONSULTATION_INFO',
    'PATIENT_PROFILE',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-consent-title"
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
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 id="grant-consent-title" style={{ fontSize: '18px', fontWeight: 800, color: '#073a78', margin: 0 }}>
              Grant Physician Access Consent
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Authorize a verified doctor to view selected medical resources.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={grantMutation.isPending}
            aria-label="Close dialog"
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            ×
          </button>
        </div>

        {validationError && (
          <div style={{ marginBottom: '16px' }}>
            <ErrorAlert title="Consent Validation" message={validationError} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Doctor Selection */}
          <div>
            <label
              htmlFor="consent-doctor"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Physician <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {doctorsData?.data && doctorsData.data.length > 0 ? (
              <select
                id="consent-doctor"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={grantMutation.isPending}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                }}
              >
                <option value="">Select a physician...</option>
                {doctorsData.data.map((doc) => (
                  <option key={doc.publicDoctorId} value={doc.publicDoctorId}>
                    {doc.displayName} ({doc.primarySpecialty || 'General Practice'}) • {doc.publicDoctorId}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="consent-doctor"
                type="text"
                placeholder="Doctor ID or Public ID (e.g. DOC-90218471)"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={grantMutation.isPending}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            )}
          </div>

          {/* Granular Resource Scopes */}
          <div>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
            >
              Authorized Resource Scopes <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allScopes.map((scope) => {
                const isChecked = selectedScopes.includes(scope);
                return (
                  <label
                    key={scope}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'}`,
                      backgroundColor: isChecked ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleScope(scope)}
                      disabled={grantMutation.isPending}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {CONSENT_SCOPE_LABELS[scope]}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {CONSENT_SCOPE_DESCRIPTIONS[scope]}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Purpose Statement */}
          <div>
            <label
              htmlFor="consent-purpose"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Purpose of Clinical Access
            </label>
            <input
              id="consent-purpose"
              type="text"
              maxLength={500}
              placeholder="e.g. Longitudinal medical consultation & care"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={grantMutation.isPending}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Optional Expiration */}
          <div>
            <label
              htmlFor="consent-expiry"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}
            >
              Optional Expiration Date
            </label>
            <input
              id="consent-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={grantMutation.isPending}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
              Leave blank to grant active access until manually revoked.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={grantMutation.isPending}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: grantMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={grantMutation.isPending}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 0,
                background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: grantMutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(11, 169, 231, 0.25)',
              }}
            >
              {grantMutation.isPending ? 'Granting...' : 'Grant Consent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
