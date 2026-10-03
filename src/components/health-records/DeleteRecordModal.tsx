import type { HealthRecordResponseDto } from '../../types/healthRecords.js';
import { useDeleteHealthRecord } from '../../hooks/useHealthRecords.js';
import { ErrorAlert } from '../common/ErrorAlert.js';

interface DeleteRecordModalProps {
  record: HealthRecordResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteRecordModal({ record, isOpen, onClose, onSuccess }: DeleteRecordModalProps) {
  const deleteMutation = useDeleteHealthRecord();

  if (!isOpen || !record) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(record.id);
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
      aria-labelledby="delete-modal-title"
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
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h2 id="delete-modal-title" style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Archive Health Record?
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              {record.publicRecordId} • {record.title}
            </p>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
          This record will be removed from your active health view. In accordance with healthcare data governance, physical files are safely archived and clinical audit history is preserved.
        </p>

        {deleteMutation.error && (
          <div style={{ marginBottom: '14px' }}>
            <ErrorAlert
              title="Archive Failed"
              message={deleteMutation.error instanceof Error ? deleteMutation.error.message : 'Unable to archive record.'}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            Keep Record
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 0,
              backgroundColor: '#dc2626',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
            }}
          >
            {deleteMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
          </button>
        </div>
      </div>
    </div>
  );
}
