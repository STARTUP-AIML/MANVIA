/**
 * MANVIA Admin Practitioner Vetting Console Route
 * Operational console for credential verification and clinical governance:
 * - Paginated practitioner verification queue with status filtering
 * - Detailed submission inspection (registration, council, experience)
 * - Credential document verification & temporary signed URL generation
 * - Atomic approval workflow
 * - Atomic rejection workflow with mandatory remediation reason
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/auth';
import {
  listAdminVerificationsApi,
  getAdminVerificationDetailApi,
  approveDoctorVerificationApi,
  rejectDoctorVerificationApi,
  getAdminDocumentAccessUrlApi,
} from '@/api/doctors';
import type { AdminVerificationDetail } from '@/types/';

export const AdminRoute: React.FC = () => {
  const { user } = useAuth();

  // Queue & Selection States
  const [verifications, setVerifications] = useState<AdminVerificationDetail[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<AdminVerificationDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [totalCount, setTotalCount] = useState(0);

  // UI Flow States
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review Form States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Authorization check: Only ADMIN active role is permitted
  const isAdmin = user?.roles?.includes('ADMIN');

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAdminVerificationsApi({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50,
      });
      setVerifications(response.items);
      setTotalCount(response.total);

      // Auto-select first item if none currently selected
      if (response.items.length > 0 && !selectedVerification) {
        setSelectedVerification(response.items[0] || null);
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load verification queue.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedVerification]);

  useEffect(() => {
    if (isAdmin) {
      void loadQueue();
    }
  }, [isAdmin, loadQueue]);

  const handleSelectVerification = async (id: string) => {
    setIsDetailLoading(true);
    setErrorMessage(null);
    try {
      const detail = await getAdminVerificationDetailApi(id);
      setSelectedVerification(detail);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load verification details.';
      setErrorMessage(msg);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const approved = await approveDoctorVerificationApi(
        selectedVerification.id,
        approvalNotes || undefined
      );
      setSelectedVerification(approved);
      setSuccessMessage(`Physician verification for ${approved.doctorProfile?.displayName || 'doctor'} approved.`);
      setApprovalNotes('');
      // Refresh list
      void loadQueue();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Approval failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerification) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setErrorMessage('Rejection reason must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const rejected = await rejectDoctorVerificationApi(
        selectedVerification.id,
        rejectionReason.trim(),
        rejectionNotes.trim() || undefined
      );
      setSelectedVerification(rejected);
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectionNotes('');
      setSuccessMessage(`Verification for ${rejected.doctorProfile?.displayName || 'doctor'} marked as rejected.`);
      // Refresh list
      void loadQueue();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Rejection failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessDocument = async (documentId: string) => {
    if (!selectedVerification) return;
    try {
      const access = await getAdminDocumentAccessUrlApi(selectedVerification.id, documentId);
      window.open(access.accessUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to generate document access URL.';
      setErrorMessage(msg);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '3rem auto' }}>
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="body-regular text-muted">
              Access to the Practitioner Vetting & Verification Console is restricted to users with active Administrator privileges.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Console Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading-1">Practitioner Vetting Console</h1>
          <p className="body-regular text-muted">
            Clinical credential validation, licensing checks, and administrative approval workflow.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Badge variant="info">Active Administrator Session</Badge>
          <Badge variant="neutral">Queue Total: {totalCount}</Badge>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMessage}</span>
          <Button size="sm" variant="ghost" onClick={() => setErrorMessage(null)}>✕</Button>
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', border: '1px solid #22c55e', borderRadius: '8px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMessage}</span>
          <Button size="sm" variant="ghost" onClick={() => setSuccessMessage(null)}>✕</Button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Status Filter:</span>
        {(['PENDING_REVIEW', 'ALL', 'APPROVED', 'REJECTED'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              border: statusFilter === filter ? '1px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: statusFilter === filter ? '#2563eb' : '#ffffff',
              color: statusFilter === filter ? '#ffffff' : '#334155',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {filter === 'PENDING_REVIEW' ? 'Pending Review' : filter === 'ALL' ? 'All Submissions' : filter === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      {/* Main Split Layout: Queue List (Left) + Detail Inspection (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Verification Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner size="md" />
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading submissions...</p>
              </div>
            ) : verifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                <p>No verification submissions found matching filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '650px', overflowY: 'auto' }}>
                {verifications.map((item) => {
                  const isSelected = selectedVerification?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectVerification(item.id)}
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#0f172a' }}>{item.doctorProfile?.displayName || 'Physician Submission'}</strong>
                        <Badge
                          variant={
                            item.status === 'APPROVED'
                              ? 'success'
                              : item.status === 'PENDING_REVIEW'
                              ? 'info'
                              : item.status === 'REJECTED'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                        <span>Reg: {item.doctorProfile?.medicalRegistrationNumber || 'N/A'}</span>
                        <span style={{ margin: '0 0.4rem' }}>•</span>
                        <span>{item.doctorProfile?.licensingCouncil || 'Council'}</span>
                      </div>
                      {item.submittedAt && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                          Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Detail Inspector */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <CardTitle>Submission Inspection</CardTitle>
              {selectedVerification && (
                <Badge
                  variant={
                    selectedVerification.status === 'APPROVED'
                      ? 'success'
                      : selectedVerification.status === 'PENDING_REVIEW'
                      ? 'info'
                      : selectedVerification.status === 'REJECTED'
                      ? 'danger'
                      : 'neutral'
                  }
                >
                  {selectedVerification.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isDetailLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Spinner size="lg" />
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading practitioner credentials...</p>
              </div>
            ) : !selectedVerification ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <p>Select a practitioner submission from the queue to inspect credentials.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Physician Registration Details */}
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>Physician Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Full Name:</span>
                      <p style={{ fontWeight: 600 }}>{selectedVerification.doctorProfile?.displayName || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Public Doctor ID:</span>
                      <p style={{ fontWeight: 600 }}>{selectedVerification.doctorProfile?.publicDoctorId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Medical License Number:</span>
                      <p style={{ fontWeight: 600 }}>{selectedVerification.doctorProfile?.medicalRegistrationNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Licensing Medical Council:</span>
                      <p style={{ fontWeight: 600 }}>{selectedVerification.doctorProfile?.licensingCouncil || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Years of Experience:</span>
                      <p style={{ fontWeight: 600 }}>{selectedVerification.doctorProfile?.yearsOfExperience || 0} years</p>
                    </div>
                  </div>
                </div>

                {/* Submission Notes */}
                {selectedVerification.submissionNotes && (
                  <div>
                    <h3 className="heading-3" style={{ marginBottom: '0.4rem' }}>Practitioner Submission Notes</h3>
                    <p style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155' }}>
                      {selectedVerification.submissionNotes}
                    </p>
                  </div>
                )}

                {/* Rejection Reason if previously rejected */}
                {selectedVerification.rejectionReason && (
                  <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px' }}>
                    <h3 className="heading-3" style={{ color: '#991b1b', marginBottom: '0.4rem' }}>Recorded Rejection Reason</h3>
                    <p style={{ color: '#7f1d1d' }}>{selectedVerification.rejectionReason}</p>
                  </div>
                )}

                {/* Credential Documents */}
                <div>
                  <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>
                    Attached Credential Documents ({selectedVerification.documents.length})
                  </h3>
                  {selectedVerification.documents.length === 0 ? (
                    <p className="text-muted" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '6px' }}>
                      No supporting documents attached to this submission.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedVerification.documents.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: '#ffffff',
                          }}
                        >
                          <div>
                            <strong>{doc.originalFileName}</strong>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                              <span>{doc.documentType}</span>
                              <span>•</span>
                              <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{doc.mimeType}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleAccessDocument(doc.id)}>
                            Inspect Document
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review Audit History */}
                {selectedVerification.reviews && selectedVerification.reviews.length > 0 && (
                  <div>
                    <h3 className="heading-3" style={{ marginBottom: '0.5rem' }}>Audit Trail & Past Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedVerification.reviews.map((r) => (
                        <div key={r.id} style={{ padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>Action: {r.action}</strong>
                            <span className="text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                          {r.reason && <p style={{ marginTop: '0.25rem', color: '#b91c1c' }}>Reason: {r.reason}</p>}
                          {r.notes && <p style={{ marginTop: '0.25rem', color: '#475569' }}>Notes: {r.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vetting Action Controls */}
                {selectedVerification.status === 'PENDING_REVIEW' && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>Administrative Decision</h3>
                    <Input
                      label="Reviewer Notes (Optional for approval)"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g. State medical registry verified on portal..."
                      disabled={isSubmitting}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <Button
                        variant="primary"
                        onClick={handleApprove}
                        isLoading={isSubmitting}
                      >
                        Approve Practitioner
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setShowRejectModal(true)}
                        disabled={isSubmitting}
                      >
                        Reject Submission
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h2 className="heading-2">Reject Verification Submission</h2>
            <p className="body-regular text-muted">
              A precise rejection reason is mandatory and will be communicated to the practitioner for credential remediation.
            </p>

            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="manvia-input-group">
                <label className="manvia-label">
                  Rejection Reason <span style={{ color: '#dc2626' }}>*</span> (min. 5 chars)
                </label>
                <textarea
                  required
                  className="manvia-input"
                  style={{ minHeight: '80px', width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Medical license expired on 2026-08-31. Please upload valid renewal certification."
                  disabled={isSubmitting}
                />
              </div>

              <Input
                label="Internal Admin Notes (Optional)"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Internal verification notes..."
                disabled={isSubmitting}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isLoading={isSubmitting} disabled={rejectionReason.trim().length < 5}>
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
