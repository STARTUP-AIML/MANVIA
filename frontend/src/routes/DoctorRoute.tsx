/**
 * MANVIA Doctor Clinical Workspace Route
 * Operational portal for verified practitioners:
 * - Profile inspection and update
 * - Professional verification lifecycle & credential document upload
 * - Recurring weekly availability schedule management
 * - Consultation offers management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
  getDoctorSelfProfileApi,
  createDoctorProfileApi,
  updateDoctorSelfProfileApi,
  getDoctorVerificationApi,
  uploadVerificationDocumentApi,
  submitDoctorVerificationApi,
  getDoctorDocumentAccessUrlApi,
  getDoctorSelfAvailabilityApi,
  createDoctorAvailabilityApi,
  deleteDoctorAvailabilityApi,
  getDoctorSelfOffersApi,
  createDoctorOfferApi,
  deleteDoctorOfferApi,
} from '@/api/doctors';
import {
  getDoctorAppointmentsApi,
  acceptDoctorAppointmentApi,
  declineDoctorAppointmentApi,
  cancelDoctorAppointmentApi,
  startDoctorAppointmentApi,
  completeDoctorAppointmentApi,
  markNoShowDoctorAppointmentApi,
  getDoctorPreConsultationApi,
} from '@/api/appointments';
import type {
  DoctorSelfProfile,
  DoctorVerificationResponse,
  DoctorAvailability,
  ConsultationOffer,
  DayOfWeek,
  ConsultationType,
  AppointmentResponseDto,
  PreConsultationResponseDto,
} from '@/types/';

type ActiveTab = 'overview' | 'appointments' | 'profile' | 'verification' | 'availability' | 'offers';

export const DoctorRoute: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Synchronize active tab with URL path
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/doctor/appointments') || path.includes('/doctor/consultations')) {
      setActiveTab('appointments');
    } else if (path.includes('/doctor/availability')) {
      setActiveTab('availability');
    } else if (path.includes('/doctor/offers')) {
      setActiveTab('offers');
    } else if (path.includes('/doctor/profile') || path.includes('/doctor/settings')) {
      setActiveTab('profile');
    } else if (path.includes('/doctor/verification')) {
      setActiveTab('verification');
    } else if (path === '/doctor' || path === '/doctor/') {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    navigate(tab === 'overview' ? '/doctor' : `/doctor/${tab}`);
  };

  // Core Data States
  const [profile, setProfile] = useState<DoctorSelfProfile | null>(null);
  const [verification, setVerification] = useState<DoctorVerificationResponse | null>(null);
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([]);
  const [offers, setOffers] = useState<ConsultationOffer[]>([]);
  const [doctorAppointments, setDoctorAppointments] = useState<AppointmentResponseDto[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Pre-consultation Inspection State
  const [selectedPreConsultation, setSelectedPreConsultation] = useState<{
    appointmentId: string;
    data: PreConsultationResponseDto | null;
    error?: string | null;
    loading: boolean;
  } | null>(null);

  // UI Flow States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form States
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [medicalRegNumber, setMedicalRegNumber] = useState('');
  const [licensingCouncil, setLicensingCouncil] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [consultationFee, setConsultationFee] = useState(100);
  const [currency, setCurrency] = useState('USD');

  // Verification Upload States
  const [docType, setDocType] = useState('MEDICAL_LICENSE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Availability Form States
  const [newDay, setNewDay] = useState<DayOfWeek>('MONDAY');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newTimezone, setNewTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Offer Form States
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerType, setOfferType] = useState<ConsultationType>('INITIAL');
  const [offerDuration, setOfferDuration] = useState(30);
  const [offerFee, setOfferFee] = useState(100);

  const loadDoctorAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const res = await getDoctorAppointmentsApi();
      setDoctorAppointments(res.data);
    } catch {
      setErrorMessage('Unable to load doctor appointments.');
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      try {
        const prof = await getDoctorSelfProfileApi();
        setProfile(prof);
        setDisplayName(prof.displayName || '');
        setBio(prof.bio || '');
        setMedicalRegNumber(prof.medicalRegistrationNumber || '');
        setLicensingCouncil(prof.licensingCouncil || '');
        setYearsExperience(prof.yearsOfExperience || 0);
        setConsultationFee(prof.defaultConsultationFee || 100);
        setCurrency(prof.currency || 'USD');

        const [verif, avail, off, appts] = await Promise.all([
          getDoctorVerificationApi().catch(() => null),
          getDoctorSelfAvailabilityApi(true).catch(() => []),
          getDoctorSelfOffersApi(true).catch(() => []),
          getDoctorAppointmentsApi().then((r) => r.data).catch(() => []),
        ]);
        setVerification(verif);
        setAvailabilities(avail);
        setOffers(off);
        setDoctorAppointments(appts);
      } catch (err: unknown) {
        // If 404, profile not yet initialized
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setProfile(null);
        } else {
          setErrorMessage('Unable to load physician clinical profile. Please try again.');
        }
      }
    } catch {
      setErrorMessage('Network or server error encountered while synchronizing workspace.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      void loadDoctorAppointments();
    }
  }, [activeTab, loadDoctorAppointments]);

  // Appointment Action Handlers
  const handleAcceptAppointment = async (appointmentId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await acceptDoctorAppointmentApi(appointmentId);
      setSuccessMessage('Appointment confirmed successfully.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to accept appointment.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    const reason = window.prompt('Please enter reason for declining appointment:');
    if (!reason) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await declineDoctorAppointmentApi(appointmentId, reason);
      setSuccessMessage('Appointment declined.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to decline appointment.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const reason = window.prompt('Please enter cancellation reason:');
    if (!reason) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await cancelDoctorAppointmentApi(appointmentId, reason);
      setSuccessMessage('Appointment cancelled.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to cancel appointment.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAppointment = async (appointmentId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await startDoctorAppointmentApi(appointmentId);
      setSuccessMessage('Appointment marked in-progress.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to start appointment.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await completeDoctorAppointmentApi(appointmentId);
      setSuccessMessage('Appointment completed successfully.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to complete appointment.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoShowAppointment = async (appointmentId: string) => {
    if (!window.confirm('Mark this appointment as patient no-show?')) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await markNoShowDoctorAppointmentApi(appointmentId);
      setSuccessMessage('Appointment marked as no-show.');
      await loadDoctorAppointments();
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 409) {
        setErrorMessage('This appointment changed before your action completed. Refresh and try again.');
      } else {
        const msg = (err as { message?: string })?.message || 'Failed to mark no-show.';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewPreConsultation = async (appointmentId: string) => {
    setSelectedPreConsultation({ appointmentId, data: null, loading: true });
    try {
      const data = await getDoctorPreConsultationApi(appointmentId);
      setSelectedPreConsultation({ appointmentId, data, loading: false });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg =
        status === 403 || status === 404
          ? 'Patient has not submitted pre-consultation intake form yet.'
          : 'Unable to load pre-consultation intake information.';
      setSelectedPreConsultation({ appointmentId, data: null, error: msg, loading: false });
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!profile) {
        // Create initial profile
        const created = await createDoctorProfileApi({
          displayName,
          bio,
          medicalRegistrationNumber: medicalRegNumber,
          licensingCouncil,
          yearsOfExperience: Number(yearsExperience),
          defaultConsultationFee: Number(consultationFee),
          currency,
        });
        setProfile(created);
        setSuccessMessage('Doctor profile successfully initialized.');
      } else {
        // Update profile
        const updated = await updateDoctorSelfProfileApi({
          displayName,
          bio,
          yearsOfExperience: Number(yearsExperience),
          defaultConsultationFee: Number(consultationFee),
          currency,
        });
        setProfile(updated);
        setSuccessMessage('Profile details successfully updated.');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to save profile changes.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a credential document to upload.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1] || '';
          await uploadVerificationDocumentApi({
            documentType: docType,
            originalFileName: selectedFile.name,
            mimeType: selectedFile.type || 'application/pdf',
            fileSizeBytes: selectedFile.size,
            contentBase64: base64Data,
          });

          // Refresh verification
          const updatedVerif = await getDoctorVerificationApi();
          setVerification(updatedVerif);
          setSelectedFile(null);
          setSuccessMessage(`Document "${selectedFile.name}" attached successfully.`);
        } catch (uploadErr: unknown) {
          const msg = (uploadErr as { message?: string })?.message || 'Document upload failed.';
          setErrorMessage(msg);
        } finally {
          setIsSubmitting(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Failed to read document file.');
    }
  };

  // Handle Verification Submit
  const handleSubmitVerification = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await submitDoctorVerificationApi(submissionNotes);
      setVerification(res);
      if (profile) {
        setProfile({ ...profile, verificationStatus: 'PENDING_REVIEW' });
      }
      setSuccessMessage('Verification workflow submitted for administrative review.');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Submission failed.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Document Access URL
  const handleViewDocument = async (documentId: string) => {
    try {
      const access = await getDoctorDocumentAccessUrlApi(documentId);
      window.open(access.accessUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to generate access URL.';
      setErrorMessage(msg);
    }
  };

  // Handle Availability Create
  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await createDoctorAvailabilityApi({
        dayOfWeek: newDay,
        startTime: newStartTime,
        endTime: newEndTime,
        timezone: newTimezone,
        isActive: true,
      });
      setAvailabilities([...availabilities, created]);
      setSuccessMessage(`Availability window created for ${newDay}.`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create availability window.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Availability Delete
  const handleDeleteAvailability = async (id: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await deleteDoctorAvailabilityApi(id);
      setAvailabilities(availabilities.filter((a) => a.id !== id));
      setSuccessMessage('Availability window removed.');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to delete availability.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Offer Create
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await createDoctorOfferApi({
        title: offerTitle,
        description: offerDescription || undefined,
        consultationType: offerType,
        durationMinutes: Number(offerDuration),
        fee: Number(offerFee),
        currency: profile?.currency || 'USD',
        status: 'ACTIVE',
      });
      setOffers([...offers, created]);
      setOfferTitle('');
      setOfferDescription('');
      setSuccessMessage(`Consultation offer "${created.title}" published.`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create consultation offer.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Offer Delete
  const handleDeleteOffer = async (id: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await deleteDoctorOfferApi(id);
      setOffers(offers.filter((o) => o.id !== id));
      setSuccessMessage('Consultation offer removed.');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to delete offer.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <Spinner size="lg" />
        <p className="body-regular text-muted">Loading Doctor Clinical Workspace...</p>
      </div>
    );
  }

  const status = profile?.verificationStatus || 'DRAFT';
  const isSuspended = status === 'SUSPENDED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading-1">Doctor Clinical Workspace</h1>
          <p className="body-regular text-muted">
            Physician care infrastructure, credential verification, and practice schedule.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Badge
            variant={
              status === 'VERIFIED'
                ? 'success'
                : status === 'PENDING_REVIEW' || status === 'SUBMITTED'
                ? 'info'
                : status === 'REJECTED' || status === 'SUSPENDED'
                ? 'danger'
                : 'warning'
            }
          >
            {status}
          </Badge>
          {profile?.publicDoctorId && (
            <Badge variant="neutral">ID: {profile.publicDoctorId}</Badge>
          )}
        </div>
      </div>

      {/* Alerts */}
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

      {isSuspended && (
        <div style={{ padding: '1.25rem', backgroundColor: '#fee2e2', border: '2px solid #b91c1c', borderRadius: '8px', color: '#7f1d1d' }}>
          <strong>Account Suspended:</strong> This practitioner profile is currently suspended. Modifications to schedule, verification, and consultation offers are restricted. Please contact administrative support.
        </div>
      )}

      {verification?.status === 'REJECTED' && verification.rejectionReason && (
        <div style={{ padding: '1.25rem', backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px', color: '#78350f' }}>
          <strong>Verification Remediation Required:</strong>
          <p style={{ marginTop: '0.5rem' }}>{verification.rejectionReason}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', gap: '0.5rem', overflowX: 'auto' }}>
        {(['overview', 'appointments', 'profile', 'verification', 'availability', 'offers'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? '600' : '400',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab ? '#2563eb' : 'var(--text-muted, #64748b)',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle>Consultation Appointments</CardTitle>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                  Manage patient consultation requests, accept or decline bookings, view pre-consultation intake, and track appointment lifecycles.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void loadDoctorAppointments()} isLoading={appointmentsLoading}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Spinner />
              </div>
            ) : doctorAppointments.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>No consultation appointments found.</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Incoming booking requests and confirmed consultations will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doctorAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{appt.publicAppointmentId}</span>
                          <Badge
                            variant={
                              appt.status === 'CONFIRMED'
                                ? 'success'
                                : appt.status === 'REQUESTED'
                                ? 'warning'
                                : appt.status === 'IN_PROGRESS'
                                ? 'info'
                                : appt.status === 'COMPLETED'
                                ? 'success'
                                : 'neutral'
                            }
                          >
                            {appt.status}
                          </Badge>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                          <strong>Patient:</strong> {appt.publicPatientId || appt.patientId}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                          <strong>Schedule:</strong> {new Date(appt.startAt).toLocaleString()} - {new Date(appt.endAt).toLocaleTimeString()}
                        </p>
                        {appt.notes && (
                          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                            <em>Notes: "{appt.notes}"</em>
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPreConsultation(appt.id)}
                        >
                          {selectedPreConsultation?.appointmentId === appt.id ? 'Hide Intake' : 'Pre-Consultation'}
                        </Button>

                        {appt.status === 'REQUESTED' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAcceptAppointment(appt.id)}
                              disabled={isSubmitting}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineAppointment(appt.id)}
                              disabled={isSubmitting}
                            >
                              Decline
                            </Button>
                          </>
                        )}

                        {appt.status === 'CONFIRMED' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStartAppointment(appt.id)}
                              disabled={isSubmitting}
                            >
                              Start Session
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAppointment(appt.id)}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNoShowAppointment(appt.id)}
                              disabled={isSubmitting}
                            >
                              Mark No-Show
                            </Button>
                          </>
                        )}

                        {appt.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCompleteAppointment(appt.id)}
                            disabled={isSubmitting}
                          >
                            Complete Session
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Pre-Consultation Intake Viewer */}
                    {selectedPreConsultation?.appointmentId === appt.id && (
                      <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>Patient Pre-Consultation Intake</strong>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedPreConsultation(null)}>✕</Button>
                        </div>
                        {selectedPreConsultation.loading ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <Spinner size="sm" />
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Loading intake details...</span>
                          </div>
                        ) : selectedPreConsultation.error ? (
                          <p style={{ fontSize: '0.85rem', color: '#b45309' }}>{selectedPreConsultation.error}</p>
                        ) : selectedPreConsultation.data ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <p><strong>Reason for Visit:</strong> {selectedPreConsultation.data.reasonForVisit || 'None specified'}</p>
                            {selectedPreConsultation.data.symptoms && (
                              <p><strong>Primary Symptoms:</strong> {selectedPreConsultation.data.symptoms}</p>
                            )}
                            {selectedPreConsultation.data.symptomOnset && (
                              <p><strong>Symptom Onset:</strong> {selectedPreConsultation.data.symptomOnset}</p>
                            )}
                            {selectedPreConsultation.data.currentMedications && (
                              <p><strong>Current Medications:</strong> {selectedPreConsultation.data.currentMedications}</p>
                            )}
                            {selectedPreConsultation.data.allergies && (
                              <p><strong>Allergies:</strong> {selectedPreConsultation.data.allergies}</p>
                            )}
                            {selectedPreConsultation.data.patientNotes && (
                              <p><strong>Patient Notes:</strong> {selectedPreConsultation.data.patientNotes}</p>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No intake data submitted.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1: Consultation Requests & Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Consultations & Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {doctorAppointments.filter((a) => a.status === 'REQUESTED').length > 0 ? (
                <div>
                  <p>
                    <strong>Pending Requests:</strong>{' '}
                    <Badge variant="warning">
                      {doctorAppointments.filter((a) => a.status === 'REQUESTED').length} Pending
                    </Badge>
                  </p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    Total Appointments: {doctorAppointments.length}
                  </p>
                  <Button size="sm" variant="primary" onClick={() => handleTabChange('appointments')} style={{ marginTop: '1rem' }}>
                    Review Requests
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-muted" style={{ marginBottom: '0.5rem' }}>
                    {doctorAppointments.length > 0
                      ? `${doctorAppointments.length} total consultation appointments scheduled.`
                      : 'No appointment requests yet.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => handleTabChange('appointments')} style={{ marginTop: '0.5rem' }}>
                    View Appointments
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p><strong>Name:</strong> {profile.displayName}</p>
                  <p><strong>License:</strong> {profile.medicalRegistrationNumber}</p>
                  <p><strong>Council:</strong> {profile.licensingCouncil}</p>
                  <p><strong>Experience:</strong> {profile.yearsOfExperience} years</p>
                  <p><strong>Default Fee:</strong> {profile.currency} {profile.defaultConsultationFee}</p>
                  <Button size="sm" variant="outline" onClick={() => handleTabChange('profile')} style={{ marginTop: '0.5rem' }}>
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>No clinical profile found. Complete setup to begin practice.</p>
                  <Button size="sm" variant="primary" onClick={() => handleTabChange('profile')}>Create Profile</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Current Status:</strong> <Badge variant={status === 'VERIFIED' ? 'success' : 'warning'}>{status}</Badge></p>
              <p style={{ marginTop: '0.5rem' }}><strong>Documents Attached:</strong> {verification?.documents.length || 0}</p>
              {verification?.submittedAt && (
                <p style={{ marginTop: '0.25rem' }}><strong>Submitted:</strong> {new Date(verification.submittedAt).toLocaleDateString()}</p>
              )}
              <Button size="sm" variant="outline" onClick={() => handleTabChange('verification')} style={{ marginTop: '1rem' }}>
                Manage Credentials
              </Button>
            </CardContent>
          </Card>

          {/* Card 4: Schedule & Offers */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Active Availability Windows:</strong> {availabilities.filter((a) => a.isActive).length}</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Published Consultation Offers:</strong> {offers.filter((o) => o.status === 'ACTIVE').length}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Button size="sm" variant="outline" onClick={() => handleTabChange('availability')}>Schedule</Button>
                <Button size="sm" variant="outline" onClick={() => handleTabChange('offers')}>Offers</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PROFILE */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>{profile ? 'Edit Doctor Profile' : 'Initialize Doctor Profile'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '640px' }}>
              <Input
                label="Full Professional Display Name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dr. Jane Doe, MD"
                disabled={isSuspended || isSubmitting}
              />

              <div className="manvia-input-group">
                <label className="manvia-label">Professional Biography</label>
                <textarea
                  className="manvia-input"
                  style={{ minHeight: '100px', width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Clinical experience, areas of specialization, patient care philosophy..."
                  disabled={isSuspended || isSubmitting}
                />
              </div>

              {!profile && (
                <>
                  <Input
                    label="Medical Registration / License Number"
                    required
                    value={medicalRegNumber}
                    onChange={(e) => setMedicalRegNumber(e.target.value)}
                    placeholder="e.g. MED-123456"
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Licensing Medical Council"
                    required
                    value={licensingCouncil}
                    onChange={(e) => setLicensingCouncil(e.target.value)}
                    placeholder="e.g. California Medical Board"
                    disabled={isSubmitting}
                  />
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input
                  label="Years of Experience"
                  type="number"
                  min="0"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  disabled={isSuspended || isSubmitting}
                />
                <Input
                  label="Default Consultation Fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  disabled={isSuspended || isSubmitting}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSuspended}
                style={{ marginTop: '0.5rem' }}
              >
                {profile ? 'Save Profile Changes' : 'Initialize Doctor Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: VERIFICATION */}
      {activeTab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Professional Credentials & Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ marginBottom: '1.5rem' }}>
                <p><strong>Status:</strong> <Badge variant={status === 'VERIFIED' ? 'success' : 'warning'}>{status}</Badge></p>
                {verification?.rejectionReason && (
                  <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
                    <strong>Rejection Feedback:</strong> {verification.rejectionReason}
                  </p>
                )}
              </div>

              {/* Upload Document Section */}
              {status !== 'VERIFIED' && status !== 'PENDING_REVIEW' && !isSuspended && (
                <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h3 className="heading-3">Upload Credential Document</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="manvia-label">Credential Type</label>
                      <select
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="MEDICAL_LICENSE">Medical License</option>
                        <option value="DEGREE_CERTIFICATE">Medical Degree Certificate</option>
                        <option value="BOARD_CERTIFICATION">Board Certification</option>
                        <option value="GOVERNMENT_ID">Government Identification</option>
                      </select>
                    </div>
                    <div>
                      <label className="manvia-label">Select Document (PDF, JPEG, PNG, max 10MB)</label>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        disabled={isSubmitting}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" isLoading={isSubmitting} disabled={!selectedFile}>
                    Upload Document
                  </Button>
                </form>
              )}

              {/* Documents List */}
              <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>Attached Credentials ({verification?.documents.length || 0})</h3>
              {(!verification?.documents || verification.documents.length === 0) ? (
                <p className="text-muted" style={{ padding: '1rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                  No documents attached yet. At least one medical license is required prior to submission.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {verification.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    >
                      <div>
                        <strong>{doc.originalFileName}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                          <span>{doc.documentType}</span>
                          <span>•</span>
                          <span>{(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleViewDocument(doc.id)}>
                        Inspect
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit for Review Button */}
              {status !== 'VERIFIED' && status !== 'PENDING_REVIEW' && !isSuspended && (
                <div style={{ marginTop: '2rem', padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <h3 className="heading-3">Ready to Submit</h3>
                  <p className="text-muted" style={{ marginBottom: '1rem' }}>
                    Submitting locks the verification workflow and places your credentials into the administrative review queue.
                  </p>
                  <Input
                    label="Submission Notes (Optional)"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Provide any additional context or state registry renewal notes..."
                    disabled={isSubmitting}
                  />
                  <Button
                    variant="primary"
                    onClick={handleSubmitVerification}
                    isLoading={isSubmitting}
                    disabled={!verification?.documents?.length}
                    style={{ marginTop: '1rem' }}
                  >
                    Submit Credentials for Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: AVAILABILITY */}
      {activeTab === 'availability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Weekly Recurring Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Availability Form */}
              {!isSuspended && (
                <form onSubmit={handleCreateAvailability} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h3 className="heading-3">Add Availability Window</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="manvia-label">Day of Week</label>
                      <select
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={newDay}
                        onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                        disabled={isSubmitting}
                      >
                        <option value="MONDAY">Monday</option>
                        <option value="TUESDAY">Tuesday</option>
                        <option value="WEDNESDAY">Wednesday</option>
                        <option value="THURSDAY">Thursday</option>
                        <option value="FRIDAY">Friday</option>
                        <option value="SATURDAY">Saturday</option>
                        <option value="SUNDAY">Sunday</option>
                      </select>
                    </div>
                    <div>
                      <Input
                        label="Start Time (HH:mm)"
                        type="time"
                        required
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Input
                        label="End Time (HH:mm)"
                        type="time"
                        required
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Input
                        label="Timezone (IANA)"
                        required
                        value={newTimezone}
                        onChange={(e) => setNewTimezone(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>
                    Add Schedule Window
                  </Button>
                </form>
              )}

              {/* Schedule List */}
              <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>Active Windows ({availabilities.length})</h3>
              {availabilities.length === 0 ? (
                <p className="text-muted" style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                  No availability windows defined. Add your consultation hours above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {availabilities.map((slot) => (
                    <div
                      key={slot.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    >
                      <div>
                        <strong>{slot.dayOfWeek}</strong>: {slot.startTime} – {slot.endTime} ({slot.timezone})
                        <Badge variant={slot.isActive ? 'success' : 'neutral'} style={{ marginLeft: '0.75rem' }}>
                          {slot.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {!isSuspended && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteAvailability(slot.id)}
                          isLoading={isSubmitting}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: OFFERS */}
      {activeTab === 'offers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Consultation Offers</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Offer Form */}
              {!isSuspended && (
                <form onSubmit={handleCreateOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h3 className="heading-3">Publish New Consultation Offer</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Input
                      label="Offer Title"
                      required
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="e.g. Initial Cardiology Assessment"
                      disabled={isSubmitting}
                    />
                    <div>
                      <label className="manvia-label">Consultation Type</label>
                      <select
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={offerType}
                        onChange={(e) => setOfferType(e.target.value as ConsultationType)}
                        disabled={isSubmitting}
                      >
                        <option value="INITIAL">Initial Consultation</option>
                        <option value="FOLLOW_UP">Follow-up Consultation</option>
                        <option value="GENERAL">General Practice</option>
                        <option value="SPECIALIST">Specialist Review</option>
                      </select>
                    </div>
                    <Input
                      label="Duration (Minutes)"
                      type="number"
                      min="5"
                      step="5"
                      required
                      value={offerDuration}
                      onChange={(e) => setOfferDuration(Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                    <Input
                      label={`Fee (${profile?.currency || 'USD'})`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={offerFee}
                      onChange={(e) => setOfferFee(Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Input
                    label="Offer Description (Optional)"
                    value={offerDescription}
                    onChange={(e) => setOfferDescription(e.target.value)}
                    placeholder="Details on what this consultation covers..."
                    disabled={isSubmitting}
                  />
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>
                    Publish Consultation Offer
                  </Button>
                </form>
              )}

              {/* Offers List */}
              <h3 className="heading-3" style={{ marginBottom: '0.75rem' }}>Published Offers ({offers.length})</h3>
              {offers.length === 0 ? (
                <p className="text-muted" style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '6px' }}>
                  No consultation offers published yet. Create an offer above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    >
                      <div>
                        <strong>{offer.title}</strong>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>
                          <span>{offer.consultationType}</span>
                          <span>•</span>
                          <span>{offer.durationMinutes} mins</span>
                          <span>•</span>
                          <span>{offer.currency} {offer.fee}</span>
                        </div>
                        {offer.description && (
                          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>{offer.description}</p>
                        )}
                      </div>
                      {!isSuspended && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteOffer(offer.id)}
                          isLoading={isSubmitting}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
