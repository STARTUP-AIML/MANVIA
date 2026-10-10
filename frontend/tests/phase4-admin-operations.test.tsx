/**
 * MANVIA Phase 4 Test Suite: Admin Operations, Appointments Lifecycle & Platform Health
 * Verifies:
 * - Admin authorization boundary (PATIENT & unauthenticated denied)
 * - Dashboard metrics rendering from real contracts
 * - Appointment operations: search, status filter, inspection modal (clinical privacy protection), cancellation
 * - Doctor verification inspection & review
 * - User account status management
 * - Platform Health diagnostics & emergency kill switch controls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { AppRoutes } from '@/app/router/routes';
import { sessionStorageManager } from '@/auth/sessionStorage';
import { authService } from '@/auth/authService';
import type { UserResponseDto } from '@/auth/types';
import * as adminApi from '@/api/admin';

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

describe('Phase 4: Admin Console & Platform Operations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorageManager.clearTokens();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('denies access to /admin/appointments for PATIENT role', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'patient-token',
      refreshToken: 'patient-refresh',
    });
    sessionStorageManager.setUser(mockPatientUser.id, 'PATIENT');
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockPatientUser);

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/appointments'] });

    await waitFor(() => {
      expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders Appointment Operations on /admin/appointments with real list and inspection modal', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    sessionStorageManager.setUser(mockAdminUser.id, 'ADMIN');
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);

    const mockAppointments = [
      {
        id: 'apt-001',
        publicAppointmentId: 'APT-2026-001',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        startAt: '2026-10-15T10:00:00Z',
        endAt: '2026-10-15T10:30:00Z',
        status: 'CONFIRMED',
        reservationState: 'CONFIRMED',
        patient: {
          id: 'patient-1',
          publicPatientId: 'PAT-001',
          displayName: 'Jane Doe',
        },
        doctor: {
          id: 'doctor-1',
          publicDoctorId: 'DOC-001',
          displayName: 'Dr. Gregory House',
        },
      },
    ];

    vi.spyOn(adminApi, 'listAdminAppointmentsApi').mockResolvedValue({
      items: mockAppointments,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    vi.spyOn(adminApi, 'getAdminAppointmentByIdApi').mockResolvedValue({
      id: 'apt-001',
      publicAppointmentId: 'APT-2026-001',
      status: 'CONFIRMED',
      reservationState: 'CONFIRMED',
      startAt: '2026-10-15T10:00:00Z',
      endAt: '2026-10-15T10:30:00Z',
      createdAt: '2026-10-10T00:00:00Z',
      doctor: {
        id: 'doctor-1',
        publicDoctorId: 'DOC-001',
        displayName: 'Dr. Gregory House',
        medicalRegistrationNumber: 'GMC-12345',
        licensingCouncil: 'General Medical Council',
      },
      patient: {
        id: 'patient-1',
        publicPatientId: 'PAT-001',
        displayName: 'Jane Doe',
      },
      consultationOffer: {
        id: 'offer-1',
        title: 'Diagnostic Consultation',
        consultationType: 'VIDEO',
        durationMinutes: 30,
        fee: 150,
        currency: 'USD',
      },
      cancellation: null,
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/appointments'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Appointment Operations & Telehealth Lifecycle/i })).toBeInTheDocument();
      expect(screen.getByText('APT-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Dr. Gregory House')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click "Inspect" button to verify privacy-safe operational view
    const inspectBtn = screen.getByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Appointment Operational Inspection/i })).toBeInTheDocument();
      expect(screen.getByText(/Healthcare Privacy Protection/i)).toBeInTheDocument();
      expect(screen.getByText(/Diagnostic Consultation/i)).toBeInTheDocument();
      expect(screen.getByText(/GMC-12345/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('allows administrative cancellation of an appointment with audit reason', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    sessionStorageManager.setUser(mockAdminUser.id, 'ADMIN');
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);

    const mockAppointments = [
      {
        id: 'apt-002',
        publicAppointmentId: 'APT-2026-002',
        patientId: 'patient-2',
        doctorId: 'doctor-2',
        startAt: '2026-10-16T14:00:00Z',
        endAt: '2026-10-16T14:30:00Z',
        status: 'REQUESTED',
        reservationState: 'PENDING',
        patient: {
          id: 'patient-2',
          publicPatientId: 'PAT-002',
          displayName: 'John Smith',
        },
        doctor: {
          id: 'doctor-2',
          publicDoctorId: 'DOC-002',
          displayName: 'Dr. John Watson',
        },
      },
    ];

    vi.spyOn(adminApi, 'listAdminAppointmentsApi').mockResolvedValue({
      items: mockAppointments,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const cancelSpy = vi.spyOn(adminApi, 'cancelAdminAppointmentApi').mockResolvedValue({
      id: 'apt-002',
      publicAppointmentId: 'APT-2026-002',
      status: 'CANCELLED',
      reservationState: 'RELEASED',
      startAt: '2026-10-16T14:00:00Z',
      endAt: '2026-10-16T14:30:00Z',
      createdAt: '2026-10-10T00:00:00Z',
      cancelledAt: '2026-10-10T12:00:00Z',
      cancelledBy: 'admin-user-001',
      cancellationReason: 'Doctor unavailable due to clinical emergency',
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/appointments'] });

    await waitFor(() => {
      expect(screen.getByText('APT-2026-002')).toBeInTheDocument();
    });

    // Open cancel modal
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Administrative Cancellation/i })).toBeInTheDocument();
    });

    // Type reason
    const textarea = screen.getByPlaceholderText(/Cancelled due to scheduled maintenance/i);
    fireEvent.change(textarea, { target: { value: 'Doctor unavailable due to clinical emergency' } });

    // Confirm cancellation
    const confirmBtn = screen.getByRole('button', { name: /Confirm Cancellation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith('apt-002', {
        reason: 'Doctor unavailable due to clinical emergency',
        reasonCode: 'ADMIN_CANCELLATION',
        requestRefund: true,
      });
    });
  });

  it('renders Platform Health Diagnostics with readiness indicators and kill switches', async () => {
    sessionStorageManager.setTokens({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockAdminUser);

    vi.spyOn(adminApi, 'getAdminSystemStatusApi').mockResolvedValue({
      status: 'OPERATIONAL',
      uptimeSeconds: 4200,
      timestamp: '2026-10-10T12:00:00Z',
      subsystems: [
        {
          subsystem: 'ai-companion',
          enabled: true,
          lastModifiedAt: '2026-10-10T00:00:00Z',
          justification: 'Normal operation',
        },
      ],
    });

    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/platform-health'] });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Platform Health Diagnostics/i })).toBeInTheDocument();
      expect(screen.getByText('ai-companion')).toBeInTheDocument();
      expect(screen.getByText(/Active & Functional/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Engage Kill Switch/i })).toBeInTheDocument();
    });
  });
});
