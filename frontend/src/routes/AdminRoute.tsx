/**
 * MANVIA Admin Console Route
 * Multi-domain administrative governance, clinical vetting & operational oversight:
 * - Platform Overview & Financial Metrics
 * - Practitioner Verification Queue & Review Console
 * - Doctor Directory Oversight
 * - User Governance & Account Lifecycle Management
 * - Immutable Audit Trail Inspection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  listAdminDoctorsApi,
  listAdminUsersApi,
  updateAdminUserStatusApi,
  queryAdminAuditLogsApi,
  getAdminPaymentsOverviewApi,
} from '@/api/admin';
import type {
  AdminVerificationDetail,
  AdminDoctorListItem,
  AdminUserListItem,
  AdminAuditLogItem,
  AdminPaymentsOverview,
} from '@/types/';

type AdminTab = 'overview' | 'verification' | 'doctors' | 'users' | 'audit';

export const AdminRoute: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Synchronize active tab with URL path
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/admin/doctor-verification') || path.includes('/admin/verification')) {
      setActiveTab('verification');
    } else if (path.includes('/admin/doctors')) {
      setActiveTab('doctors');
    } else if (path.includes('/admin/users')) {
      setActiveTab('users');
    } else if (path.includes('/admin/audit')) {
      setActiveTab('audit');
    } else if (path === '/admin' || path === '/admin/') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      navigate('/admin');
    } else if (tab === 'verification') {
      navigate('/admin/doctor-verification');
    } else {
      navigate(`/admin/${tab}`);
    }
  };

  // Common UI State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TAB 1: OVERVIEW METRICS STATE
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [paymentsOverview, setPaymentsOverview] = useState<AdminPaymentsOverview | null>(null);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState<number>(0);
  const [totalDoctorsCount, setTotalDoctorsCount] = useState<number>(0);
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);

  // TAB 2: VERIFICATION QUEUE STATE
  const [verifications, setVerifications] = useState<AdminVerificationDetail[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<AdminVerificationDetail | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<string>('PENDING_REVIEW');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  // TAB 3: DOCTOR DIRECTORY STATE
  const [doctorsList, setDoctorsList] = useState<AdminDoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorVerificationFilter, setDoctorVerificationFilter] = useState('');

  // TAB 4: USER GOVERNANCE STATE
  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<AdminUserListItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState('SUSPENDED');
  const [statusReason, setStatusReason] = useState('');

  // TAB 5: AUDIT LOGS STATE
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionSearch, setAuditActionSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('');

  // Authorization check: Only ADMIN active role is permitted
  const isAdmin = user?.roles?.includes('ADMIN');

  // LOAD OVERVIEW METRICS
  const loadOverviewMetrics = useCallback(async () => {
    setOverviewLoading(true);
    setErrorMessage(null);
    try {
      const [payments, verifs, docs, usrs] = await Promise.all([
        getAdminPaymentsOverviewApi().catch(() => null),
        listAdminVerificationsApi({ status: 'PENDING_REVIEW', limit: 1 }).catch(() => ({ items: [], total: 0 })),
        listAdminDoctorsApi({ limit: 1 }).catch(() => ({ items: [], total: 0 })),
        listAdminUsersApi({ limit: 1 }).catch(() => ({ items: [], total: 0 })),
      ]);
      setPaymentsOverview(payments);
      setPendingVerificationsCount(verifs.total);
      setTotalDoctorsCount(docs.total);
      setTotalUsersCount(usrs.total);
    } catch {
      setErrorMessage('Failed to load administrative overview metrics.');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // LOAD VERIFICATION QUEUE
  const loadVerificationQueue = useCallback(async () => {
    setVerificationLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAdminVerificationsApi({
        status: verificationFilter === 'ALL' ? undefined : verificationFilter,
        limit: 50,
      });
      setVerifications(response.items);
      if (response.items.length > 0 && !selectedVerification) {
        setSelectedVerification(response.items[0] || null);
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load verification queue.';
      setErrorMessage(msg);
    } finally {
      setVerificationLoading(false);
    }
  }, [verificationFilter, selectedVerification]);

  // LOAD DOCTORS DIRECTORY
  const loadDoctorsDirectory = useCallback(async () => {
    setDoctorsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAdminDoctorsApi({
        search: doctorSearch || undefined,
        verificationStatus: doctorVerificationFilter || undefined,
        limit: 50,
      });
      setDoctorsList(response.items);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load doctor directory.';
      setErrorMessage(msg);
    } finally {
      setDoctorsLoading(false);
    }
  }, [doctorSearch, doctorVerificationFilter]);

  // LOAD USERS GOVERNANCE
  const loadUsersGovernance = useCallback(async () => {
    setUsersLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAdminUsersApi({
        search: userSearch || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        limit: 50,
      });
      setUsersList(response.items);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load user directory.';
      setErrorMessage(msg);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // LOAD AUDIT LOGS
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setErrorMessage(null);
    try {
      const response = await queryAdminAuditLogsApi({
        action: auditActionSearch || undefined,
        status: auditStatusFilter || undefined,
        limit: 50,
      });
      setAuditLogs(response.items);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to load audit logs.';
      setErrorMessage(msg);
    } finally {
      setAuditLoading(false);
    }
  }, [auditActionSearch, auditStatusFilter]);

  // Trigger loads based on active tab
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'overview') {
      void loadOverviewMetrics();
    } else if (activeTab === 'verification') {
      void loadVerificationQueue();
    } else if (activeTab === 'doctors') {
      void loadDoctorsDirectory();
    } else if (activeTab === 'users') {
      void loadUsersGovernance();
    } else if (activeTab === 'audit') {
      void loadAuditLogs();
    }
  }, [isAdmin, activeTab, loadOverviewMetrics, loadVerificationQueue, loadDoctorsDirectory, loadUsersGovernance, loadAuditLogs]);

  // VERIFICATION HANDLERS
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
      void loadVerificationQueue();
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
      void loadVerificationQueue();
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

  // USER GOVERNANCE STATUS UPDATE HANDLER
  const handleUpdateUserStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;
    if (!statusReason.trim() || statusReason.trim().length < 5) {
      setErrorMessage('Status update reason must be at least 5 characters long.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateAdminUserStatusApi(selectedUserForStatus.id, {
        status: newStatusValue,
        reason: statusReason.trim(),
      });
      setSuccessMessage(`Account status for ${selectedUserForStatus.email} updated to ${newStatusValue}.`);
      setSelectedUserForStatus(null);
      setStatusReason('');
      void loadUsersGovernance();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to update user status.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
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
              Access to the Administration Console is restricted to users with active Administrator privileges.
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
          <h1 className="heading-1">Practitioner Vetting Console & Platform Governance</h1>
          <p className="body-regular text-muted">
            Executive oversight, practitioner vetting, user governance, and security audit trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Badge variant="info">Active Administrator Session</Badge>
          <Badge variant="neutral">Role: ADMIN</Badge>
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

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', gap: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Platform Metrics' },
          { id: 'verification', label: 'Doctor Verification' },
          { id: 'doctors', label: 'Doctor Directory' },
          { id: 'users', label: 'User Governance' },
          { id: 'audit', label: 'Audit Trail' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as AdminTab)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab.id ? '#2563eb' : 'var(--text-muted, #64748b)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PLATFORM OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {/* Card: Pending Doctor Verifications */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>
                      {pendingVerificationsCount}
                    </span>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {pendingVerificationsCount === 1 ? 'Submission awaiting review' : 'Submissions awaiting review'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTabChange('verification')}
                      style={{ marginTop: '0.75rem' }}
                    >
                      Review Queue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Total Registered Doctors */}
            <Card>
              <CardHeader>
                <CardTitle>Doctor Directory</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                      {totalDoctorsCount}
                    </span>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Total practitioner profiles
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTabChange('doctors')}
                      style={{ marginTop: '0.75rem' }}
                    >
                      Browse Doctors
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Total Registered Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>User Governance</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
                      {totalUsersCount}
                    </span>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Total user accounts
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTabChange('users')}
                      style={{ marginTop: '0.75rem' }}
                    >
                      Manage Users
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Financial Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <div>
                    <span style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>
                      ${((paymentsOverview?.metrics?.totalSucceededRevenue || 0) / 100).toFixed(2)}
                    </span>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Succeeded Revenue ({paymentsOverview?.metrics?.succeededCount || 0} transactions)
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Refunds: {paymentsOverview?.metrics?.pendingRefundsCount || 0}</span>
                      <span>•</span>
                      <span>Payouts: {paymentsOverview?.metrics?.pendingPayoutsCount || 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: DOCTOR VERIFICATION QUEUE & REVIEW */}
      {activeTab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Status Filter:</span>
            {(['PENDING_REVIEW', 'ALL', 'APPROVED', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setVerificationFilter(filter)}
                style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: '20px',
                  border: verificationFilter === filter ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: verificationFilter === filter ? '#2563eb' : '#ffffff',
                  color: verificationFilter === filter ? '#ffffff' : '#334155',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle>Verification Queue</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => void loadVerificationQueue()} isLoading={verificationLoading}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {verificationLoading ? (
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
        </div>
      )}

      {/* TAB 3: DOCTOR DIRECTORY */}
      {activeTab === 'doctors' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <CardTitle>Doctor Directory Oversight</CardTitle>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Platform-wide directory of physician credentials, specialty qualifications, and active verification statuses.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadDoctorsDirectory()} isLoading={doctorsLoading}>
                Refresh Directory
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <Input
                  label="Search Doctor (Name, Public ID, Reg #)"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="e.g. Cardiologist, DOC-001..."
                />
              </div>
              <div style={{ minWidth: '200px' }}>
                <label className="manvia-label">Verification Filter</label>
                <select
                  className="manvia-input"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={doctorVerificationFilter}
                  onChange={(e) => setDoctorVerificationFilter(e.target.value)}
                >
                  <option value="">All Verification States</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>

            {doctorsLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Spinner size="md" />
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading physician directory...</p>
              </div>
            ) : doctorsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>No doctor profiles found.</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Doctor records will appear once practitioners register and initialize clinical profiles.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Doctor</th>
                      <th style={{ padding: '0.75rem' }}>Public ID</th>
                      <th style={{ padding: '0.75rem' }}>License & Council</th>
                      <th style={{ padding: '0.75rem' }}>Experience</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Specialties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorsList.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{doc.displayName}</strong>
                          {doc.user?.email && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.user.email}</div>}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{doc.publicDoctorId}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{doc.medicalRegistrationNumber}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.licensingCouncil}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{doc.yearsOfExperience} yrs</td>
                        <td style={{ padding: '0.75rem' }}>
                          <Badge
                            variant={
                              doc.verificationStatus === 'VERIFIED'
                                ? 'success'
                                : doc.verificationStatus === 'PENDING_REVIEW'
                                ? 'info'
                                : doc.verificationStatus === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {doc.verificationStatus}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {doc.specialties && doc.specialties.length > 0
                            ? doc.specialties.map((s) => s.specialty?.name).filter(Boolean).join(', ')
                            : 'General'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: USER GOVERNANCE */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <CardTitle>User Governance & Identity</CardTitle>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Account lifecycle management, active session monitoring, and operational status controls.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadUsersGovernance()} isLoading={usersLoading}>
                Refresh Users
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <Input
                  label="Search User (Email or Phone)"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="e.g. user@manvia.health"
                />
              </div>
              <div style={{ minWidth: '160px' }}>
                <label className="manvia-label">Role Filter</label>
                <select
                  className="manvia-input"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="PATIENT">PATIENT</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div style={{ minWidth: '160px' }}>
                <label className="manvia-label">Status Filter</label>
                <select
                  className="manvia-input"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                </select>
              </div>
            </div>

            {usersLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Spinner size="md" />
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading user directory...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>No users found matching query.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Email / Phone</th>
                      <th style={{ padding: '0.75rem' }}>Roles</th>
                      <th style={{ padding: '0.75rem' }}>Account Status</th>
                      <th style={{ padding: '0.75rem' }}>Active Sessions</th>
                      <th style={{ padding: '0.75rem' }}>Created</th>
                      <th style={{ padding: '0.75rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{u.email}</strong>
                          {u.phone && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.phone}</div>}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {u.roles.map((r) => (
                              <Badge key={r} variant={r === 'ADMIN' ? 'danger' : r === 'DOCTOR' ? 'info' : 'neutral'}>
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <Badge variant={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'warning'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{u.activeSessionCount}</td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserForStatus(u);
                              setNewStatusValue(u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                              setStatusReason('');
                            }}
                          >
                            Manage Status
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <CardTitle>Platform Audit Trail</CardTitle>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Immutable security and operational event log recording administrative and clinical state transitions.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadAuditLogs()} isLoading={auditLoading}>
                Refresh Trail
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <Input
                  label="Search Action"
                  value={auditActionSearch}
                  onChange={(e) => setAuditActionSearch(e.target.value)}
                  placeholder="e.g. VERIFY_DOCTOR, APPOINTMENT_CONFIRM..."
                />
              </div>
              <div style={{ minWidth: '160px' }}>
                <label className="manvia-label">Status Filter</label>
                <select
                  className="manvia-input"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILURE">FAILURE</option>
                </select>
              </div>
            </div>

            {auditLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Spinner size="md" />
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>Loading audit log entries...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>No audit events logged.</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Administrative actions and sensitive clinical workflows are recorded here automatically.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem' }}>Action</th>
                      <th style={{ padding: '0.75rem' }}>Resource</th>
                      <th style={{ padding: '0.75rem' }}>Actor</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>IP / Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong>{log.action}</strong>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div>{log.resourceType}</div>
                          {log.resourceId && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{log.resourceId}</div>}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {log.actorUserId || 'System'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <Badge variant={log.status === 'SUCCESS' ? 'success' : 'danger'}>
                            {log.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                          <div>{log.ipAddress || '—'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection Modal for Verification */}
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

      {/* User Status Update Modal */}
      {selectedUserForStatus && (
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
            <h2 className="heading-2">Update User Account Status</h2>
            <p className="body-regular text-muted">
              Target account: <strong>{selectedUserForStatus.email}</strong>
            </p>

            <form onSubmit={handleUpdateUserStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="manvia-label">New Status</label>
                <select
                  className="manvia-input"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                </select>
              </div>

              <div className="manvia-input-group">
                <label className="manvia-label">
                  Reason for Status Change <span style={{ color: '#dc2626' }}>*</span> (min. 5 chars)
                </label>
                <textarea
                  required
                  className="manvia-input"
                  style={{ minHeight: '80px', width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Account suspended following administrative security audit..."
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="outline" onClick={() => setSelectedUserForStatus(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={statusReason.trim().length < 5}>
                  Save Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
