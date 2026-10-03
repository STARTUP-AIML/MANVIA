import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  HealthRecordCategory,
  HealthRecordStatus,
  HealthRecordResponseDto,
  ConsentResponseDto,
} from '../types/healthRecords.js';
import { HEALTH_RECORD_CATEGORY_LABELS } from '../types/healthRecords.js';
import { useHealthRecords, useConsents } from '../hooks/useHealthRecords.js';
import { HealthRecordCard } from '../components/health-records/HealthRecordCard.js';
import { UploadRecordModal } from '../components/health-records/UploadRecordModal.js';
import { RecordPreviewModal } from '../components/health-records/RecordPreviewModal.js';
import { DeleteRecordModal } from '../components/health-records/DeleteRecordModal.js';
import { ConsentCard } from '../components/consent/ConsentCard.js';
import { GrantConsentModal } from '../components/consent/GrantConsentModal.js';
import { RevokeConsentModal } from '../components/consent/RevokeConsentModal.js';
import { ConsentAuditHistoryModal } from '../components/consent/ConsentAuditHistoryModal.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { ErrorAlert } from '../components/common/ErrorAlert.js';
import { EmptyState } from '../components/common/EmptyState.js';

export function HealthRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'consents' ? 'consents' : 'records';

  // Filters for Records
  const [selectedCategory, setSelectedCategory] = useState<HealthRecordCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<HealthRecordStatus | 'ALL'>('AVAILABLE');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state for Records
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<HealthRecordResponseDto | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<HealthRecordResponseDto | null>(null);

  // Modals state for Consents
  const [isGrantConsentOpen, setIsGrantConsentOpen] = useState(false);
  const [revokeConsent, setRevokeConsent] = useState<ConsentResponseDto | null>(null);
  const [historyConsent, setHistoryConsent] = useState<ConsentResponseDto | null>(null);

  // Queries
  const recordsQuery = useHealthRecords({
    category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
    status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
  });

  const consentsQuery = useConsents();

  const handleTabChange = (tab: 'records' | 'consents') => {
    if (tab === 'consents') {
      setSearchParams({ tab: 'consents' });
    } else {
      setSearchParams({});
    }
  };

  // Filter records by search term
  const filteredRecords = (recordsQuery.data?.data || []).filter((rec) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      rec.title.toLowerCase().includes(term) ||
      rec.originalFileName.toLowerCase().includes(term) ||
      rec.publicRecordId.toLowerCase().includes(term) ||
      (rec.description && rec.description.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      {/* Page Title & Tab Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Health Records & Consent
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Manage medical documents, clinical reports, and doctor access permissions securely.
          </p>
        </div>

        {/* Primary Action Button */}
        {activeTab === 'records' ? (
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '24px',
              border: 0,
              background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(11, 169, 231, 0.28)',
            }}
          >
            <span>⬆</span> Upload Document
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsGrantConsentOpen(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '24px',
              border: 0,
              background: 'linear-gradient(90deg, #0ba9e7, #684be8)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(11, 169, 231, 0.28)',
            }}
          >
            <span>➕</span> Grant Doctor Access
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('records')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'records' ? 700 : 500,
            color: activeTab === 'records' ? '#096ed3' : '#64748b',
            border: 0,
            borderBottom: activeTab === 'records' ? '2px solid #096ed3' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📁</span>
          <span>My Records</span>
          {recordsQuery.data?.total !== undefined && (
            <span
              style={{
                fontSize: '11px',
                background: activeTab === 'records' ? '#eff6ff' : '#f1f5f9',
                color: activeTab === 'records' ? '#1d4ed8' : '#64748b',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {recordsQuery.data.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('consents')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'consents' ? 700 : 500,
            color: activeTab === 'consents' ? '#096ed3' : '#64748b',
            border: 0,
            borderBottom: activeTab === 'consents' ? '2px solid #096ed3' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🛡️</span>
          <span>Doctor Access & Consent</span>
          {consentsQuery.data && (
            <span
              style={{
                fontSize: '11px',
                background: activeTab === 'consents' ? '#eff6ff' : '#f1f5f9',
                color: activeTab === 'consents' ? '#1d4ed8' : '#64748b',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {consentsQuery.data.filter((c) => c.status === 'ACTIVE').length} active
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: HEALTH RECORDS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'records' && (
        <div>
          {/* Filter Bar */}
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '14px 18px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search records by title, document name, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 34px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: '14px',
                  }}
                >
                  🔍
                </span>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as HealthRecordStatus | 'ALL')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                  color: '#334155',
                }}
              >
                <option value="AVAILABLE">Active Records</option>
                <option value="ALL">All Statuses</option>
                <option value="ARCHIVED">Archived</option>
                <option value="DELETED">Removed</option>
              </select>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: selectedCategory === 'ALL' ? 700 : 500,
                  backgroundColor: selectedCategory === 'ALL' ? '#073a78' : '#f1f5f9',
                  color: selectedCategory === 'ALL' ? '#fff' : '#475569',
                  border: 0,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All Categories
              </button>
              {(Object.keys(HEALTH_RECORD_CATEGORY_LABELS) as HealthRecordCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    backgroundColor: selectedCategory === cat ? '#073a78' : '#f1f5f9',
                    color: selectedCategory === cat ? '#fff' : '#475569',
                    border: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {HEALTH_RECORD_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Records List / States */}
          {recordsQuery.isLoading && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <LoadingSpinner message="Accessing encrypted health vault..." size="large" />
            </div>
          )}

          {recordsQuery.error && (
            <div style={{ marginBottom: '20px' }}>
              <ErrorAlert
                title="Failed to Load Health Records"
                message={recordsQuery.error instanceof Error ? recordsQuery.error.message : 'Unable to connect to health records service.'}
                onRetry={() => { void recordsQuery.refetch(); }}
              />
            </div>
          )}

          {!recordsQuery.isLoading && !recordsQuery.error && filteredRecords.length === 0 && (
            <EmptyState
              icon="📁"
              title="No Health Records Found"
              description={
                searchTerm || selectedCategory !== 'ALL'
                  ? 'No records match your selected filters. Try adjusting your query.'
                  : 'You have not uploaded any medical records or documents yet. Your uploaded records will appear here securely.'
              }
              actionLabel="Upload First Document"
              onAction={() => setIsUploadModalOpen(true)}
            />
          )}

          {!recordsQuery.isLoading && !recordsQuery.error && filteredRecords.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredRecords.map((record) => (
                <HealthRecordCard
                  key={record.id}
                  record={record}
                  onPreview={(rec) => setPreviewRecord(rec)}
                  onDelete={(rec) => setDeleteRecord(rec)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DOCTOR ACCESS & CONSENT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'consents' && (
        <div>
          {/* Privacy & Governance Explainer Banner */}
          <div
            style={{
              background: 'linear-gradient(108deg, #eff6ff 0%, #f0fdf4 100%)',
              border: '1px solid #bfdbfe',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px' }}>
                Zero-Trust Patient Consent Architecture
              </h3>
              <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                Physicians can only inspect your health records when granted explicit, granular, and time-bounded consent. You retain complete ownership and can revoke access at any time.
              </p>
            </div>
          </div>

          {consentsQuery.isLoading && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <LoadingSpinner message="Checking active clinical consents..." size="large" />
            </div>
          )}

          {consentsQuery.error && (
            <div style={{ marginBottom: '20px' }}>
              <ErrorAlert
                title="Failed to Load Consents"
                message={consentsQuery.error instanceof Error ? consentsQuery.error.message : 'Unable to connect to consent management service.'}
                onRetry={() => { void consentsQuery.refetch(); }}
              />
            </div>
          )}

          {!consentsQuery.isLoading && !consentsQuery.error && (!consentsQuery.data || consentsQuery.data.length === 0) && (
            <EmptyState
              icon="🛡️"
              title="No Doctor Access Grants"
              description="No healthcare providers currently have active access to your medical records or health timeline."
              actionLabel="Grant Access to a Doctor"
              onAction={() => setIsGrantConsentOpen(true)}
            />
          )}

          {!consentsQuery.isLoading && !consentsQuery.error && consentsQuery.data && consentsQuery.data.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {consentsQuery.data.map((consent) => (
                <ConsentCard
                  key={consent.id}
                  consent={consent}
                  onRevoke={(c) => setRevokeConsent(c)}
                  onViewHistory={(c) => setHistoryConsent(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Modals */}
      <UploadRecordModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => recordsQuery.refetch()}
      />

      <RecordPreviewModal
        isOpen={Boolean(previewRecord)}
        record={previewRecord}
        onClose={() => setPreviewRecord(null)}
      />

      <DeleteRecordModal
        isOpen={Boolean(deleteRecord)}
        record={deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onSuccess={() => recordsQuery.refetch()}
      />

      {/* Consent Modals */}
      <GrantConsentModal
        isOpen={isGrantConsentOpen}
        onClose={() => setIsGrantConsentOpen(false)}
        onSuccess={() => consentsQuery.refetch()}
      />

      <RevokeConsentModal
        isOpen={Boolean(revokeConsent)}
        consent={revokeConsent}
        onClose={() => setRevokeConsent(null)}
        onSuccess={() => consentsQuery.refetch()}
      />

      <ConsentAuditHistoryModal
        isOpen={Boolean(historyConsent)}
        consent={historyConsent}
        onClose={() => setHistoryConsent(null)}
      />
    </div>
  );
}
