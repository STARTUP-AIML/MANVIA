import type { HealthRecordResponseDto } from '../../types/healthRecords.js';
import { useRecordDownloadUrl } from '../../hooks/useHealthRecords.js';
import { LoadingSpinner } from '../common/LoadingSpinner.js';
import { ErrorAlert } from '../common/ErrorAlert.js';

interface RecordPreviewModalProps {
  record: HealthRecordResponseDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecordPreviewModal({ record, isOpen, onClose }: RecordPreviewModalProps) {
  const { data, isLoading, error } = useRecordDownloadUrl(record?.id || '', isOpen && Boolean(record));

  if (!isOpen || !record) return null;

  const isImage = record.mimeType.startsWith('image/');
  const isPdf = record.mimeType === 'application/pdf';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 58, 120, 0.5)',
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
          maxWidth: '720px',
          padding: '24px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 id="preview-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#073a78', margin: 0 }}>
                {record.title}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  background: '#f1f5f9',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: '#64748b',
                }}
              >
                {record.publicRecordId}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
              Original file: {record.originalFileName} • {(record.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
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

        {/* Content area */}
        <div
          style={{
            flex: 1,
            minHeight: '260px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <LoadingSpinner message="Requesting time-limited secure vault access..." size="medium" />
            </div>
          )}

          {error && (
            <div style={{ padding: '20px', width: '100%' }}>
              <ErrorAlert
                title="Access Unavailable"
                message={error instanceof Error ? error.message : 'Could not generate secure download link.'}
              />
            </div>
          )}

          {!isLoading && !error && data?.downloadUrl && (
            <>
              {isImage ? (
                <div style={{ maxHeight: '420px', overflow: 'auto', padding: '12px', width: '100%', textAlign: 'center' }}>
                  <img
                    src={data.downloadUrl}
                    alt={record.title}
                    style={{ maxWidth: '100%', maxHeight: '390px', borderRadius: '8px', objectFit: 'contain' }}
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${data.downloadUrl}#toolbar=0`}
                  title={record.title}
                  style={{ width: '100%', height: '420px', border: 0 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Document Ready for Secure Retrieval
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 16px' }}>
                    Click below to download this medical record directly.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Security Notice & Actions */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
            <span>🔒</span>
            <span>
              Secure signed link expires in <strong>5 minutes</strong>. Temporary URL is never permanently stored.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
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
            {data?.downloadUrl && (
              <a
                href={data.downloadUrl}
                download={record.originalFileName}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(11, 169, 231, 0.25)',
                }}
              >
                <span>⬇</span> Download File
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
