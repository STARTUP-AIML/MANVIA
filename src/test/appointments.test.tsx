import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.js';
import { AppointmentStatusBadge } from '../components/appointments/AppointmentStatusBadge.js';
import { AppointmentCard } from '../components/appointments/AppointmentCard.js';
import { PreConsultationForm } from '../components/appointments/PreConsultationForm.js';
import { AppointmentsPage } from '../pages/AppointmentsPage.js';
import { AppointmentDetailPage } from '../pages/AppointmentDetailPage.js';
import { PreConsultationPage } from '../pages/PreConsultationPage.js';
import * as appointmentsApi from '../api/appointments.js';
import { ApiError } from '../api/client.js';
import type {
  AppointmentResponseDto,
  PreConsultationResponseDto,
  AppointmentStatus,
  SlotReservationState,
} from '../types/appointments.js';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const mockUpcomingAppointment: AppointmentResponseDto = {
  id: 'apt-uuid-1',
  publicAppointmentId: 'APT-1001ABCD',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  doctorDisplayName: 'Dr. Gregory House, MD',
  consultationOfferId: 'offer-1',
  offerTitle: 'Standard Diagnostic Consultation',
  startAt: '2026-10-15T14:00:00.000Z',
  endAt: '2026-10-15T14:30:00.000Z',
  durationMinutes: 30,
  fee: 150,
  currency: 'USD',
  status: 'CONFIRMED',
  reservationState: 'BOOKED' as SlotReservationState,
  notes: 'Unexplained joint pain and fatigue',
  hasPreConsultation: false,
  preConsultationStatus: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const mockPastAppointment: AppointmentResponseDto = {
  id: 'apt-uuid-2',
  publicAppointmentId: 'APT-1002EFGH',
  patientId: 'patient-1',
  doctorId: 'doctor-2',
  doctorDisplayName: 'Dr. Lisa Cuddy, MD',
  consultationOfferId: 'offer-2',
  offerTitle: 'Follow-up Consultation',
  startAt: '2026-08-10T10:00:00.000Z',
  endAt: '2026-08-10T10:30:00.000Z',
  durationMinutes: 30,
  fee: 120,
  currency: 'USD',
  status: 'COMPLETED',
  reservationState: 'BOOKED' as SlotReservationState,
  hasPreConsultation: true,
  preConsultationStatus: 'SUBMITTED',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-10T11:00:00.000Z',
};


const mockDraftPreConsultation: PreConsultationResponseDto = {
  id: 'pc-uuid-1',
  appointmentId: 'apt-uuid-1',
  patientId: 'patient-1',
  status: 'DRAFT',
  reasonForVisit: 'Persistent joint stiffness every morning',
  symptoms: 'Swelling in knuckles, knee stiffness',
  symptomOnset: '3 weeks ago',
  currentMedications: 'Ibuprofen 400mg as needed',
  allergies: 'Penicillin',
  patientNotes: 'Symptoms worsen in colder weather',
  submittedAt: null,
  createdAt: '2026-10-02T08:00:00.000Z',
  updatedAt: '2026-10-02T09:30:00.000Z',
};

const mockSubmittedPreConsultation: PreConsultationResponseDto = {
  ...mockDraftPreConsultation,
  status: 'SUBMITTED',
  submittedAt: '2026-10-02T10:00:00.000Z',
};

describe('Phase 8 — Appointments & Pre-Consultation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'patient-1',
        email: 'patient@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'test-valid-bearer-token');
  });

  describe('AppointmentStatusBadge', () => {
    const statuses: Array<{ status: AppointmentStatus; expectedText: string }> = [
      { status: 'REQUESTED', expectedText: 'Waiting for Doctor Confirmation' },
      { status: 'CONFIRMED', expectedText: 'Confirmed' },
      { status: 'RESERVED', expectedText: 'Reserved' },
      { status: 'IN_PROGRESS', expectedText: 'In Progress' },
      { status: 'COMPLETED', expectedText: 'Completed' },
      { status: 'CANCELLED', expectedText: 'Cancelled' },
      { status: 'DECLINED', expectedText: 'Doctor Declined' },
      { status: 'EXPIRED', expectedText: 'Expired' },
      { status: 'NO_SHOW', expectedText: 'No-Show' },
    ];

    statuses.forEach(({ status, expectedText }) => {
      it(`maps backend status ${status} to accessible label "${expectedText}"`, () => {
        render(<AppointmentStatusBadge status={status} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(expectedText);
      });
    });
  });

  describe('AppointmentCard', () => {
    it('renders appointment details correctly with formatted UTC time and links', () => {
      render(
        <MemoryRouter>
          <AppointmentCard appointment={mockUpcomingAppointment} />
        </MemoryRouter>
      );

      expect(screen.getByText('APT-1001ABCD')).toBeInTheDocument();
      expect(screen.getByText('Dr. Gregory House, MD')).toBeInTheDocument();
      expect(screen.getByText(/standard diagnostic consultation/i)).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText(/2:00 PM – 2:30 PM UTC/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute(
        'href',
        '/appointments/APT-1001ABCD'
      );
      expect(screen.getByRole('link', { name: /fill intake/i })).toHaveAttribute(
        'href',
        '/appointments/APT-1001ABCD/pre-consultation'
      );
    });

    it('displays pre-consultation completed indicator when already submitted', () => {
      render(
        <MemoryRouter>
          <AppointmentCard
            appointment={{
              ...mockUpcomingAppointment,
              hasPreConsultation: true,
              preConsultationStatus: 'SUBMITTED',
            }}
          />
        </MemoryRouter>
      );

      expect(screen.getByText(/pre-consultation complete/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute(
        'href',
        '/appointments/APT-1001ABCD'
      );
    });
  });

  describe('AppointmentsPage', () => {
    it('renders loading skeleton state initially', () => {
      vi.spyOn(appointmentsApi, 'getPatientAppointmentsApi').mockReturnValue(new Promise(() => {}));

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter>
              <AppointmentsPage />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      expect(screen.getByLabelText(/loading appointments/i)).toBeInTheDocument();
    });

    it('renders empty appointment state when user has no appointments', async () => {
      vi.spyOn(appointmentsApi, 'getPatientAppointmentsApi').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter>
              <AppointmentsPage />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/no upcoming consultations/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('link', { name: /find a doctor/i })).toHaveAttribute('href', '/doctors');
    });

    it('renders error state when backend returns 500 error', async () => {
      vi.spyOn(appointmentsApi, 'getPatientAppointmentsApi').mockRejectedValue(
        new ApiError('Failed to fetch appointments', 500)
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter>
              <AppointmentsPage />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch appointments/i)).toBeInTheDocument();
      });
    });

    it('renders upcoming appointments and switches tabs', async () => {
      vi.spyOn(appointmentsApi, 'getPatientAppointmentsApi').mockImplementation(async (params) => {
        if (params?.timeFilter === 'PAST') {
          return {
            data: [mockPastAppointment],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          };
        }
        return {
          data: [mockUpcomingAppointment],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter>
              <AppointmentsPage />
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('APT-1001ABCD')).toBeInTheDocument();
      });

      // Switch to Past tab
      const pastTab = screen.getByRole('tab', { name: /past & completed/i });
      fireEvent.click(pastTab);

      await waitFor(() => {
        expect(screen.getByText('APT-1002EFGH')).toBeInTheDocument();
      });
    });
  });

  describe('AppointmentDetailPage', () => {
    it('renders appointment details with doctor, schedule, and actions', async () => {
      vi.spyOn(appointmentsApi, 'getAppointmentByIdApi').mockResolvedValue(mockUpcomingAppointment);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/appointments/apt-uuid-1']}>
            <Routes>
              <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('APT-1001ABCD')).toBeInTheDocument();
      });

      expect(screen.getByText('Dr. Gregory House, MD')).toBeInTheDocument();
      expect(screen.getByText('Standard Diagnostic Consultation')).toBeInTheDocument();
      expect(screen.getByText('USD 150')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete pre-consultation intake/i })).toHaveAttribute(
        'href',
        '/appointments/APT-1001ABCD/pre-consultation'
      );
    });

    it('handles backend 403 / 401 authorization error gracefully', async () => {
      vi.spyOn(appointmentsApi, 'getAppointmentByIdApi').mockRejectedValue(
        new ApiError('You are not authorized to view this appointment', 403)
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/appointments/apt-forbidden']}>
            <Routes>
              <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      });
      expect(
        screen.getByText(/you are not authorized to view this appointment/i)
      ).toBeInTheDocument();
    });

    it('opens cancellation modal, validates reason, and submits cancellation', async () => {
      vi.spyOn(appointmentsApi, 'getAppointmentByIdApi').mockResolvedValue(mockUpcomingAppointment);
      const cancelSpy = vi
        .spyOn(appointmentsApi, 'cancelAppointmentApi')
        .mockResolvedValue({
          ...mockUpcomingAppointment,
          status: 'CANCELLED',
          cancellationReason: 'Need to reschedule due to emergency',
        });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/appointments/apt-uuid-1']}>
            <Routes>
              <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument();
      });

      // Click cancel appointment button
      fireEvent.click(screen.getByRole('button', { name: /cancel appointment/i }));

      // Modal should appear
      expect(screen.getByRole('dialog', { name: /cancel appointment/i })).toBeInTheDocument();

      const reasonInput = screen.getByLabelText(/reason for cancellation/i);
      const confirmBtn = screen.getByRole('button', { name: /confirm cancellation/i });

      // Submitting with less than 3 characters is rejected by client validation
      fireEvent.change(reasonInput, { target: { value: 'ab' } });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/cancellation reason with at least 3 characters/i)
        ).toBeInTheDocument();
      });
      expect(cancelSpy).not.toHaveBeenCalled();

      // Enter valid reason
      fireEvent.change(reasonInput, { target: { value: 'Need to reschedule due to emergency' } });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(cancelSpy).toHaveBeenCalledWith(
          'apt-uuid-1',
          'Need to reschedule due to emergency'
        );
      });
    });

    it('handles cancellation conflict 409 error when appointment state has changed', async () => {
      vi.spyOn(appointmentsApi, 'getAppointmentByIdApi').mockResolvedValue(mockUpcomingAppointment);
      vi.spyOn(appointmentsApi, 'cancelAppointmentApi').mockRejectedValue(
        new ApiError('Appointment has already been completed or cancelled.', 409)
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/appointments/apt-uuid-1']}>
            <Routes>
              <Route path="/appointments/:appointmentId" element={<AppointmentDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel appointment/i }));

      const reasonInput = screen.getByLabelText(/reason for cancellation/i);
      fireEvent.change(reasonInput, { target: { value: 'Patient requested cancellation' } });

      const confirmBtn = screen.getByRole('button', { name: /confirm cancellation/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/appointment has already been completed or cancelled/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('PreConsultationForm & PreConsultationPage', () => {
    it('renders medical safety notice and required fields', () => {
      render(
        <PreConsultationForm
          initialData={null}
          isLocked={false}
          onSaveDraft={vi.fn()}
          onSubmitIntake={vi.fn()}
          isSavingDraft={false}
          isSubmitting={false}
        />
      );

      // Medical safety notice
      expect(
        screen.getByText(/please provide the information requested below to help your physician prepare for your consultation/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/primary reason for visit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/symptoms description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/known drug or environmental allergies/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit pre-consultation/i })).toBeInTheDocument();
    });

    it('validates required reasonForVisit field before submission', async () => {
      const submitSpy = vi.fn();
      render(
        <PreConsultationForm
          initialData={null}
          isLocked={false}
          onSaveDraft={vi.fn()}
          onSubmitIntake={submitSpy}
          isSavingDraft={false}
          isSubmitting={false}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /submit pre-consultation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/primary reason for your consultation visit/i)).toBeInTheDocument();
      });
      expect(submitSpy).not.toHaveBeenCalled();
    });

    it('submits pre-consultation intake successfully', async () => {
      const submitSpy = vi.fn().mockResolvedValue(undefined);
      render(
        <PreConsultationForm
          initialData={mockDraftPreConsultation}
          isLocked={false}
          onSaveDraft={vi.fn()}
          onSubmitIntake={submitSpy}
          isSavingDraft={false}
          isSubmitting={false}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /submit pre-consultation/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith({
          reasonForVisit: 'Persistent joint stiffness every morning',
          symptoms: 'Swelling in knuckles, knee stiffness',
          symptomOnset: '3 weeks ago',
          currentMedications: 'Ibuprofen 400mg as needed',
          allergies: 'Penicillin',
          patientNotes: 'Symptoms worsen in colder weather',
        });
      });
    });

    it('renders locked read-only state when pre-consultation is already submitted', () => {
      render(
        <PreConsultationForm
          initialData={mockSubmittedPreConsultation}
          isLocked={true}
          onSaveDraft={vi.fn()}
          onSubmitIntake={vi.fn()}
          isSavingDraft={false}
          isSubmitting={false}
        />
      );

      expect(screen.getByText(/submitted & locked/i)).toBeInTheDocument();
      const reasonInput = screen.getByLabelText(/primary reason for visit/i);
      expect(reasonInput).toBeDisabled();
      expect(screen.queryByRole('button', { name: /submit pre-consultation/i })).not.toBeInTheDocument();
    });

    it('prevents duplicate submission while isSubmitting is true', () => {
      render(
        <PreConsultationForm
          initialData={mockDraftPreConsultation}
          isLocked={false}
          onSaveDraft={vi.fn()}
          onSubmitIntake={vi.fn()}
          isSavingDraft={false}
          isSubmitting={true}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /submitting & locking/i });
      expect(submitBtn).toBeDisabled();
    });

    it('integrates PreConsultationPage with backend endpoints and saves draft', async () => {
      vi.spyOn(appointmentsApi, 'getAppointmentByIdApi').mockResolvedValue(mockUpcomingAppointment);
      vi.spyOn(appointmentsApi, 'getPreConsultationApi').mockResolvedValue(mockDraftPreConsultation);
      const saveDraftSpy = vi
        .spyOn(appointmentsApi, 'saveDraftPreConsultationApi')
        .mockResolvedValue(mockDraftPreConsultation);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/appointments/apt-uuid-1/pre-consultation']}>
            <Routes>
              <Route
                path="/appointments/:appointmentId/pre-consultation"
                element={<PreConsultationPage />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/pre-consultation clinical intake/i)).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Persistent joint stiffness every morning')).toBeInTheDocument();

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      fireEvent.click(saveDraftBtn);

      await waitFor(() => {
        expect(saveDraftSpy).toHaveBeenCalledWith('apt-uuid-1', {
          reasonForVisit: 'Persistent joint stiffness every morning',
          symptoms: 'Swelling in knuckles, knee stiffness',
          symptomOnset: '3 weeks ago',
          currentMedications: 'Ibuprofen 400mg as needed',
          allergies: 'Penicillin',
          patientNotes: 'Symptoms worsen in colder weather',
        });
      });
    });
  });
});
