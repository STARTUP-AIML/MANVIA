
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import App from '@/app/app';

vi.mock('@/api/appointments', async () => {
  const actual = await vi.importActual('@/api/appointments');
  return {
    ...actual,
    getPatientAppointmentsApi: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'apt-nav-1',
          publicAppointmentId: 'APT-NAV-TEST',
          patientId: 'pat-auth-test',
          doctorId: 'doc-1',
          doctorDisplayName: 'Dr. Emily Carter, MD',
          doctorSpecialty: 'Pediatrics',
          offerTitle: 'Standard Consultation',
          consultationType: 'GENERAL',
          startAt: '2026-11-01T10:00:00.000Z',
          endAt: '2026-11-01T10:30:00.000Z',
          durationMinutes: 30,
          fee: 100,
          currency: 'USD',
          status: 'CONFIRMED',
          preConsultationStatus: null,
          createdAt: '2026-10-01T09:00:00.000Z',
          updatedAt: '2026-10-01T09:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    getAppointmentByIdApi: vi.fn().mockResolvedValue({
      id: 'apt-nav-1',
      publicAppointmentId: 'APT-NAV-TEST',
      patientId: 'pat-auth-test',
      doctorId: 'doc-1',
      doctorDisplayName: 'Dr. Emily Carter, MD',
      doctorSpecialty: 'Pediatrics',
      offerTitle: 'Standard Consultation',
      consultationType: 'GENERAL',
      startAt: '2026-11-01T10:00:00.000Z',
      endAt: '2026-11-01T10:30:00.000Z',
      durationMinutes: 30,
      fee: 100,
      currency: 'USD',
      status: 'CONFIRMED',
      preConsultationStatus: 'NOT_STARTED',
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    }),
    getPreConsultationApi: vi.fn().mockResolvedValue(null),
  };
});

function renderAppWithRoute(initialRoute: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Appointments Navigation & Route Protection — Phase 8', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('redirects unauthenticated user accessing /appointments to login', async () => {
    renderAppWithRoute('/appointments');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing /appointments/:id/pre-consultation to login', async () => {
    renderAppWithRoute('/appointments/apt-nav-1/pre-consultation');
    expect(screen.getByText('Welcome to MANVIA')).toBeInTheDocument();
  });

  it('allows authenticated patient to access /appointments list', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/appointments');
    await waitFor(() => {
      expect(screen.getByText('My Appointments')).toBeInTheDocument();
      expect(screen.getByText('APT-NAV-TEST')).toBeInTheDocument();
    });
  });

  it('allows authenticated patient to access deep link /care/appointments', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/care/appointments');
    await waitFor(() => {
      expect(screen.getByText('My Appointments')).toBeInTheDocument();
    });
  });

  it('allows authenticated patient to view appointment detail /appointments/:appointmentId', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-auth-test',
        email: 'patient.auth@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/appointments/apt-nav-1');
    await waitFor(() => {
      expect(screen.getByText('APT-NAV-TEST')).toBeInTheDocument();
    });
    expect(screen.getByText('Dr. Emily Carter, MD')).toBeInTheDocument();
  });

  it('blocks non-patient (e.g. DOCTOR role) from accessing patient appointments area', async () => {
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'doc-auth-test',
        email: 'doctor.auth@manvia.health',
        roles: ['DOCTOR'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');

    renderAppWithRoute('/appointments');
    await waitFor(() => {
      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    });
  });
});
