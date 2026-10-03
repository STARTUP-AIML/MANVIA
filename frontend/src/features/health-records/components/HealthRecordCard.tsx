import { Link } from 'react-router-dom';
import type { HealthRecordResponseDto } from '@/types/healthRecords';
import { HealthRecordCategoryBadge } from './HealthRecordCategoryBadge';

interface HealthRecordCardProps {
  record: HealthRecordResponseDto;
  onPreview: (record: HealthRecordResponseDto) => void;
  onDelete: (record: HealthRecordResponseDto) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function HealthRecordCard({ record, onPreview, onDelete }: HealthRecordCardProps) {
  const isDeleted = record.status === 'DELETED';
  const isArchived = record.status === 'ARCHIVED';

  return (
    <article
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(7, 58, 120, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: isDeleted ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      <div>
        {/* Header row: Category & Public ID */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <HealthRecordCategoryBadge category={record.category} />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#64748b',
              background: '#f8fafc',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            {record.publicRecordId}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}
        >
          {record.title}
        </h3>

        {/* Clinical Date */}
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span>
          <span>Clinical Date: <strong>{formatDate(record.recordedDate)}</strong></span>
        </p>

        {/* Description if present */}
        {record.description && (
          <p
            style={{
              fontSize: '12px',
              color: '#475569',
              margin: '0 0 12px',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {record.description}
          </p>
        )}

        {/* File metadata info box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.originalFileName}>
            📎 {record.originalFileName}
          </span>
          <span style={{ fontWeight: 600, color: '#64748b', flexShrink: 0 }}>
            {formatBytes(record.fileSizeBytes)}
          </span>
        </div>
      </div>

      {/* Footer action buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onPreview(record)}
            disabled={isDeleted}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#096ed3',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              cursor: isDeleted ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>👁</span> View / Download
          </button>

          <Link
            to={`/health-records/${encodeURIComponent(record.id)}`}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#475569',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Details
          </Link>
        </div>

        {!isDeleted && !isArchived && (
          <button
            type="button"
            onClick={() => onDelete(record)}
            aria-label={`Remove record ${record.title}`}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              color: '#ef4444',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Archive
          </button>
        )}
      </div>
    </article>
  );
}
