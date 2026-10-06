import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useHealthRecordDetail,
  useUpdateHealthRecord,
  useRecordDownloadUrl,
  useConsents,
} from '@/hooks/useHealthRecords';
import { HealthRecordCategoryBadge } from '@/features/health-records/components/HealthRecordCategoryBadge';
import { RecordPreviewModal } from '@/features/health-records/components/RecordPreviewModal';
import { DeleteRecordModal } from '@/features/health-records/components/DeleteRecordModal';
import {
  HealthRecordCategory,
  HEALTH_RECORD_CATEGORY_LABELS,
  ConsentScope,
  ConsentStatus,
} from '@/types/healthRecords';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function HealthRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();

  const safeRecordId = recordId || '';
  const { data: record, isLoading, error } = useHealthRecordDetail(safeRecordId);
  const { data: consentsData } = useConsents();
  const updateMutation = useUpdateHealthRecord();
  const downloadUrlQuery = useRecordDownloadUrl(safeRecordId, false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<HealthRecordCategory>(HealthRecordCategory.OTHER);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = () => {
    if (!record) return;
    setEditTitle(record.title);
    setEditCategory(record.category);
    setEditDate(record.recordedDate ? (record.recordedDate.split('T')[0] ?? '') : '');
    setEditDescription(record.description || '');
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeRecordId) return;
    if (!editTitle.trim()) {
      setEditError('Title is required');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        recordId: safeRecordId,
        dto: {
          title: editTitle.trim(),
          category: editCategory,
          recordedDate: editDate ? new Date(editDate).toISOString() : undefined,
          description: editDescription.trim() || undefined,
        },
      });
      setEditOpen(false);
    } catch (err) {
      setEditError((err as Error).message || 'Failed to update record');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await downloadUrlQuery.refetch();
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Handled by query state
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading health record..." size="large" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div
        style={{
          maxWidth: '700px',
          margin: '40px auto',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #fee2e2',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
          Record Not Found or Inaccessible
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          This health record does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/app/health-records"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#096ed3',
            color: '#fff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          ← Back to Health Records
        </Link>
      </div>
    );
  }

  // Filter active doctor consents that authorize HEALTH_RECORDS access
  const authorizedDoctorConsents = (consentsData || []).filter(
    (c) =>
      c.status === ConsentStatus.ACTIVE &&
      c.isCurrentlyActive &&
      c.scope === ConsentScope.HEALTH_RECORDS
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button */}
      <div>
        <Link
          to="/app/health-records"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#096ed3',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          ← Back to Health Records
        </Link>
      </div>

      {/* Main Header Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <HealthRecordCategoryBadge category={record.category} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: record.status === 'AVAILABLE' ? '#dcfce7' : '#f1f5f9',
                  color: record.status === 'AVAILABLE' ? '#166534' : '#475569',
                }}
              >
                {record.status}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {record.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Record Date:{' '}
              {record.recordedDate
                ? new Date(record.recordedDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not specified'}
              {' • Added on '}
              {new Date(record.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPreviewOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: '#096ed3',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              👁 View Document
            </button>

            <button
              onClick={handleDownload}
              disabled={downloadUrlQuery.isFetching}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: '#f1f5f9',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: downloadUrlQuery.isFetching ? 'not-allowed' : 'pointer',
              }}
            >
              📥 {downloadUrlQuery.isFetching ? 'Generating...' : 'Download'}
            </button>

            <button
              onClick={handleOpenEdit}
              style={{
                padding: '9px 16px',
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✏️ Edit
            </button>

            <button
              onClick={() => setDeleteOpen(true)}
              style={{
                padding: '9px 16px',
                background: '#fff',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🗑 Archive
            </button>
          </div>
        </div>

        {record.description && (
          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              color: '#334155',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Notes / Description
            </strong>
            {record.description}
          </div>
        )}
      </div>

      {/* File Specifications Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          📄 File Specifications & Metadata
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Original File Name:</span>
            <span style={{ fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>{record.originalFileName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>MIME Content Type:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{record.mimeType}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>File Size:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatBytes(record.fileSizeBytes)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>Public Identifier:</span>
            <span style={{ fontWeight: 600, color: '#475569', fontSize: '12px', fontFamily: 'monospace' }}>
              {record.publicRecordId}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Storage Status:</span>
            <span style={{ color: '#059669', fontWeight: 600 }}>Securely encrypted at rest</span>
          </div>
        </div>
      </div>

      {/* Doctor Access & Consent Visibility Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              🛡️ Physician Access & Consent Visibility
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Physicians can only view this record if you have explicitly granted them Health Records consent.
            </p>
          </div>
          <Link
            to="/app/health-records?tab=consents"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#096ed3',
              textDecoration: 'none',
              padding: '6px 12px',
              background: '#eff6ff',
              borderRadius: '8px',
            }}
          >
            Manage Consents →
          </Link>
        </div>

        {authorizedDoctorConsents.length === 0 ? (
          <div
            style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              color: '#475569',
            }}
          >
            🔒 <strong>Private to you:</strong> No doctors currently have active consent to access your health records.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Doctors with authorized Health Records access:
            </span>
            {authorizedDoctorConsents.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong style={{ color: '#166534' }}>
                    {c.doctorDisplayName}
                  </strong>
                  <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '12px' }}>
                    {c.publicDoctorId} • Purpose: {c.purpose || 'Care and consultation'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                  Active Access
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Metadata Modal */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-record-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 id="edit-record-title" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              Edit Record Details
            </h2>

            {editError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="edit-title" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Document Title *
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-cat" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  id="edit-cat"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as HealthRecordCategory)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                >
                  {(Object.keys(HealthRecordCategory) as Array<keyof typeof HealthRecordCategory>).map((key) => {
                    const catVal = HealthRecordCategory[key];
                    return (
                      <option key={catVal} value={catVal}>
                        {HEALTH_RECORD_CATEGORY_LABELS[catVal]}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="edit-date" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Record Date
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label htmlFor="edit-desc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Notes / Description
                </label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  style={{
                    padding: '8px 18px',
                    background: '#096ed3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <RecordPreviewModal
          record={record}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* Delete / Archive Modal */}
      {deleteOpen && (
        <DeleteRecordModal
          record={record}
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onSuccess={() => {
            setDeleteOpen(false);
            navigate('/app/health-records');
          }}
        />
      )}
    </div>
  );
}
