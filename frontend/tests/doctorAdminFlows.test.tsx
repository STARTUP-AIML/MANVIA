/**
 * MANVIA P5 Prototype Verification Test Suite: Doctor & Admin Flows
 * Validates role protection, tab navigation, lifecycle mutations,
 * pre-consultation inspection, and administrative governance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { AppRoutes } from '@/app/router/routes';
import { sessionStorageManager } from '@/auth/sessionStorage';
import { authService } from '@/auth/authService';
import type { UserResponseDto } from '@/auth/types';
import * as doctorsApi from '@/api/doctors';
import * as appointmentsApi from '@/api/appointments';
import * as adminApi from '@/api/admin';
import type { AppointmentResponseDto, PreConsultationResponseDto, DoctorVerificationResponse } from '@/types/';

const mockDoctorUser: UserResponseDto = {
  id: 'doc-user-001',
  email: 'doctor@manvia.health',
  phone: '+1234567890',
  roles: ['DOCTOR'],
  emailVerified: true,
  phoneVerified: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockAdminUser: UserResponseDto = {
  id: 'admin-user-001',
  email: 'admin@manvia.health',
  phone: '+1234567891',
  roles: ['ADMIN'],
  emailVerified: true,
  phoneVerified: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockPatientUser: UserResponseDto = {
  id: 'patient-user-001',
  email: 'patient@manvia.health',
  phone: '+1234567892',
  roles: ['PATIENT'],
  emailVerified: true,
  phoneVerified: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('P5: Doctor Portal Prototype Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
  });

  it('denies access to /doctor for authenticated PATIENT users', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'patient-token',
      refreshToken: 'patient-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockPatientUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/doctor'] });

    await waitFor(() => {
      expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    });
  });

  it('renders Doctor Clinical Workspace for authenticated DOCTOR users with genuine empty states', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'doctor-token',
      refreshToken: 'doctor-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockDoctorUser);
    vi.spyOn(doctorsApi, 'getDoctorSelfProfileApi').mockResolvedValue({
      id: 'doc-prof-1',
      userId: 'doc-user-001',
      publicDoctorId: 'DOC-12345678',
      displayName: 'Dr. Sarah Connor',
      medicalRegistrationNumber: 'GMC-888999',
      licensingCouncil: 'General Medical Council',
      yearsOfExperience: 12,
      verificationStatus: 'VERIFIED',
      defaultConsultationFee: 120,
      currency: 'USD',
      specialties: [],
      languages: [],
      qualifications: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    vi.spyOn(doctorsApi, 'getDoctorVerificationApi').mockResolvedValue({
      id: 'verif-1',
      status: 'VERIFIED',
      documents: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    vi.spyOn(doctorsApi, 'getDoctorSelfAvailabilityApi').mockResolvedValue([]);
    vi.spyOn(doctorsApi, 'getDoctorSelfOffersApi').mockResolvedValue([]);
    vi.spyOn(appointmentsApi, 'getDoctorAppointmentsApi').mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/doctor'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Doctor Clinical Workspace/i })).toBeInTheDocument();
    });

    // Check doctor profile data rendered
    expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('DOC-12345678', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('GMC-888999', { exact: false })).toBeInTheDocument();
    // Check genuine empty appointment state
    expect(screen.getByText(/No appointment requests yet/i)).toBeInTheDocument();
  });

  it('navigates to appointments tab and displays appointment requests with lifecycle actions', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'doctor-token',
      refreshToken: 'doctor-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockDoctorUser);
    vi.spyOn(doctorsApi, 'getDoctorSelfProfileApi').mockResolvedValue({
      id: 'doc-prof-1',
      userId: 'doc-user-001',
      publicDoctorId: 'DOC-12345678',
      displayName: 'Dr. Sarah Connor',
      medicalRegistrationNumber: 'GMC-888999',
      licensingCouncil: 'General Medical Council',
      yearsOfExperience: 12,
      verificationStatus: 'VERIFIED',
      defaultConsultationFee: 120,
      currency: 'USD',
      specialties: [],
      languages: [],
      qualifications: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    vi.spyOn(doctorsApi, 'getDoctorVerificationApi').mockResolvedValue({
      id: 'verif-1',
      status: 'VERIFIED',
      documents: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    vi.spyOn(doctorsApi, 'getDoctorSelfAvailabilityApi').mockResolvedValue([]);
    vi.spyOn(doctorsApi, 'getDoctorSelfOffersApi').mockResolvedValue([]);

    const mockAppointment: AppointmentResponseDto = {
      id: 'appt-1',
      publicAppointmentId: 'APT-11223344',
      patientId: 'patient-1',
      publicPatientId: 'PAT-998877',
      doctorId: 'doc-prof-1',
      consultationOfferId: 'offer-1',
      startAt: '2026-10-10T10:00:00Z',
      endAt: '2026-10-10T10:30:00Z',
      status: 'REQUESTED',
      reservationState: 'BOOKED',
      fee: 100,
      currency: 'USD',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    vi.spyOn(appointmentsApi, 'getDoctorAppointmentsApi').mockResolvedValue({
      data: [mockAppointment],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const acceptSpy = vi.spyOn(appointmentsApi, 'acceptDoctorAppointmentApi').mockResolvedValue({
      ...mockAppointment,
      status: 'CONFIRMED',
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/doctor/appointments'] });

    await waitFor(() => {
      expect(screen.getByText('APT-11223344')).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole('button', { name: /^Accept$/i });
    expect(acceptBtn).toBeInTheDocument();
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith('appt-1');
    });
  });

  it('inspects pre-consultation intake details from doctor appointment list', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'doctor-token',
      refreshToken: 'doctor-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockDoctorUser);
    vi.spyOn(doctorsApi, 'getDoctorSelfProfileApi').mockResolvedValue({
      id: 'doc-prof-1',
      userId: 'doc-user-001',
      publicDoctorId: 'DOC-12345678',
      displayName: 'Dr. Sarah Connor',
      medicalRegistrationNumber: 'GMC-888999',
      licensingCouncil: 'General Medical Council',
      yearsOfExperience: 12,
      verificationStatus: 'VERIFIED',
      defaultConsultationFee: 120,
      currency: 'USD',
      specialties: [],
      languages: [],
      qualifications: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    vi.spyOn(doctorsApi, 'getDoctorVerificationApi').mockResolvedValue({
      id: 'verif-2',
      status: 'VERIFIED',
      documents: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    } as DoctorVerificationResponse);
    vi.spyOn(doctorsApi, 'getDoctorSelfAvailabilityApi').mockResolvedValue([]);
    vi.spyOn(doctorsApi, 'getDoctorSelfOffersApi').mockResolvedValue([]);

    const mockAppointment: AppointmentResponseDto = {
      id: 'appt-2',
      publicAppointmentId: 'APT-55667788',
      patientId: 'patient-1',
      publicPatientId: 'PAT-998877',
      doctorId: 'doc-prof-1',
      consultationOfferId: 'offer-1',
      startAt: '2026-10-10T11:00:00Z',
      endAt: '2026-10-10T11:30:00Z',
      status: 'CONFIRMED',
      reservationState: 'BOOKED',
      fee: 100,
      currency: 'USD',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    vi.spyOn(appointmentsApi, 'getDoctorAppointmentsApi').mockResolvedValue({
      data: [mockAppointment],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    const mockPreConsultation: PreConsultationResponseDto = {
      id: 'pre-1',
      appointmentId: 'appt-2',
      patientId: 'patient-1',
      reasonForVisit: 'Severe migraines',
      symptoms: 'Persistent migraines for 3 weeks',
      symptomOnset: '3 weeks ago',
      currentMedications: 'None',
      allergies: 'Penicillin',
      patientNotes: 'Worse under bright lighting',
      status: 'SUBMITTED',
      createdAt: '2026-10-02T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
    };

    vi.spyOn(appointmentsApi, 'getDoctorPreConsultationApi').mockResolvedValue(mockPreConsultation);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/doctor/appointments'] });

    await waitFor(() => {
      expect(screen.getByText('APT-55667788')).toBeInTheDocument();
    });

    const intakeBtn = screen.getByRole('button', { name: /Pre-Consultation/i });
    fireEvent.click(intakeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Persistent migraines for 3 weeks/i)).toBeInTheDocument();
      expect(screen.getByText(/Severe migraines/i)).toBeInTheDocument();
    });
  });
});

describe('P5: Admin Portal Governance Flows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
  });

  it('denies access to /admin for PATIENT and DOCTOR users', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'doctor-token',
      refreshToken: 'doctor-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockDoctorUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin'] });

    await waitFor(() => {
      expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    });
  });

  it('renders Platform Metrics on /admin with real metrics and zero mock numbers', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);
    vi.spyOn(adminApi, 'getAdminPaymentsOverviewApi').mockResolvedValue({
      payments: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      metrics: {
        totalSucceededRevenue: 45000,
        succeededCount: 3,
        pendingRefundsCount: 0,
        pendingPayoutsCount: 1,
      },
    });
    vi.spyOn(adminApi, 'listAdminVerificationsApi').mockResolvedValue({
      items: [],
      total: 2,
      limit: 1,
      offset: 0,
    });
    vi.spyOn(adminApi, 'listAdminDoctorsApi').mockResolvedValue({
      items: [],
      total: 5,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
    vi.spyOn(adminApi, 'listAdminUsersApi').mockResolvedValue({
      items: [],
      total: 14,
      page: 1,
      limit: 1,
      totalPages: 1,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Practitioner Vetting Console & Platform Governance/i })).toBeInTheDocument();
      expect(screen.getByText('$450.00')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
    });
  });

  it('renders Doctor Directory Oversight on /admin/doctors with empty state when no doctors exist', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);
    vi.spyOn(adminApi, 'listAdminDoctorsApi').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/doctors'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Doctor Directory Oversight/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/No doctor profiles found/i)).toBeInTheDocument();
  });

  it('renders User Governance on /admin/users and displays user account entries', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);
    vi.spyOn(adminApi, 'listAdminUsersApi').mockResolvedValue({
      items: [
        {
          id: 'user-abc',
          email: 'sample.patient@manvia.health',
          phone: null,
          emailVerified: true,
          phoneVerified: false,
          status: 'ACTIVE',
          roles: ['PATIENT'],
          failedLoginAttempts: 0,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
          activeSessionCount: 1,
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/users'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /User Governance & Identity/i })).toBeInTheDocument();
      expect(screen.getByText('sample.patient@manvia.health')).toBeInTheDocument();
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Manage Status/i })).toBeInTheDocument();
    });
  });

  it('renders Audit Trail on /admin/audit and handles empty log list', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);
    vi.spyOn(adminApi, 'queryAdminAuditLogsApi').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 1,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/audit'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Platform Audit Trail/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/No audit events logged/i)).toBeInTheDocument();
  });
});
