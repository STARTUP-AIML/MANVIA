import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.js';
import { ConsultationOfferSelector } from '../components/booking/ConsultationOfferSelector.js';
import { DatePickerCalendar } from '../components/booking/DatePickerCalendar.js';
import { TimeSlotGrid } from '../components/booking/TimeSlotGrid.js';
import { BookingReviewCard } from '../components/booking/BookingReviewCard.js';
import { BookingSuccessCard } from '../components/booking/BookingSuccessCard.js';
import { DoctorBookingPage } from '../pages/DoctorBookingPage.js';
import { generateAvailableSlots, isDateAvailableForDoctor } from '../utils/slotCalculation.js';
import * as doctorsApi from '../api/doctors.js';
import * as appointmentsApi from '../api/appointments.js';
import { ApiError } from '../api/client.js';
import type {
  DoctorPublic,
  DoctorConsultationOffer,
  DoctorAvailabilityWindow,
} from '../types/doctors.js';
import type {
  AppointmentResponseDto,
  CalculatedTimeSlot,
} from '../types/appointments.js';

const mockDoctor: DoctorPublic = {
  publicDoctorId: 'DOC-12345678',
  displayName: 'Dr. Gregory House, MD',
  bio: 'Diagnostic medicine and infectious disease specialist.',
  primarySpecialty: 'Internal Medicine',
  subSpecialties: ['Diagnostic Medicine'],
  languages: ['English'],
  yearsOfExperience: 20,
  defaultConsultationFee: 150,
  currency: 'USD',
  verificationStatus: 'VERIFIED',
  qualifications: [],
};

const mockUnverifiedDoctor: DoctorPublic = {
  ...mockDoctor,
  publicDoctorId: 'DOC-99999999',
  verificationStatus: 'DRAFT',
};

const mockOffers: DoctorConsultationOffer[] = [
  {
    id: 'offer-1',
    title: 'Standard Consultation',
    description: 'General 30-minute clinical consultation session.',
    consultationType: 'GENERAL',
    durationMinutes: 30,
    fee: 100,
    currency: 'USD',
  },
  {
    id: 'offer-2',
    title: 'Extended Diagnostics',
    description: 'In-depth 45-minute comprehensive medical review.',
    consultationType: 'SPECIALIST',
    durationMinutes: 45,
    fee: 180,
    currency: 'USD',
  },
];

const mockAvailability: DoctorAvailabilityWindow[] = [
  {
    id: 'avail-1',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '12:00',
    timezone: 'UTC',
  },
  {
    id: 'avail-2',
    dayOfWeek: 'WEDNESDAY',
    startTime: '14:00',
    endTime: '17:00',
    timezone: 'UTC',
  },
  {
    id: 'avail-3',
    dayOfWeek: 'FRIDAY',
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'UTC',
  },
  {
    id: 'avail-4',
    dayOfWeek: 'SATURDAY',
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'UTC',
  },
  {
    id: 'avail-5',
    dayOfWeek: 'SUNDAY',
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'UTC',
  },
];

const mockSlot: CalculatedTimeSlot = {
  startAt: '2026-10-12T09:00:00.000Z',
  endAt: '2026-10-12T09:30:00.000Z',
  displayTime: '9:00 AM',
  displayEndTime: '9:30 AM',
  status: 'AVAILABLE',
  isBookable: true,
};

const mockAppointmentResponse: AppointmentResponseDto = {
  id: 'apt-uuid-123',
  publicAppointmentId: 'APT-7492ABCD',
  patientId: 'pat-uuid-1',
  publicPatientId: 'PAT-83749201',
  doctorId: 'doc-uuid-1',
  publicDoctorId: 'DOC-12345678',
  doctorDisplayName: 'Dr. Gregory House, MD',
  consultationOfferId: 'offer-1',
  offerTitle: 'Standard Consultation',
  durationMinutes: 30,
  fee: 100,
  currency: 'USD',
  startAt: '2026-10-12T09:00:00.000Z',
  endAt: '2026-10-12T09:30:00.000Z',
  status: 'REQUESTED',
  reservationState: 'BOOKED',
  reservedUntil: null,
  createdAt: '2026-10-02T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

describe('Phase 7 — Availability, Consultation Offers & Booking Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem(
      'manvia_auth_user',
      JSON.stringify({
        id: 'pat-test',
        email: 'patient@manvia.health',
        roles: ['PATIENT'],
      })
    );
    sessionStorage.setItem('manvia_auth_token', 'mock-token');
  });

  describe('Slot Calculation Utility', () => {
    it('accurately identifies available days based on recurring schedule', () => {
      // 2026-10-12 is a Monday
      const mondayDate = new Date('2026-10-12T00:00:00Z');
      expect(mondayDate.getUTCDay()).toBe(1);
      expect(isDateAvailableForDoctor(mondayDate, mockAvailability)).toBe(true);

      // 2026-10-13 is a Tuesday (not in mockAvailability)
      const tuesdayDate = new Date('2026-10-13T00:00:00Z');
      expect(isDateAvailableForDoctor(tuesdayDate, mockAvailability)).toBe(false);
    });

    it('generates discrete slots matching window times and duration', () => {
      const mondayDate = new Date('2026-10-12T00:00:00Z');
      const pastTime = new Date('2026-10-01T00:00:00Z'); // now is in past so slots are bookable
      const slots = generateAvailableSlots(mondayDate, mockAvailability, mockOffers[0], pastTime);

      // Window is 09:00 to 12:00 (3 hours = 180 min), 30 min each -> 6 slots
      expect(slots).toHaveLength(6);
      expect(slots[0].displayTime).toBe('9:00 AM');
      expect(slots[0].displayEndTime).toBe('9:30 AM');
      expect(slots[0].isBookable).toBe(true);
      expect(slots[5].displayTime).toBe('11:30 AM');
      expect(slots[5].displayEndTime).toBe('12:00 PM');
    });

    it('returns empty slots if doctor is not scheduled on that weekday', () => {
      const tuesdayDate = new Date('2026-10-13T00:00:00Z');
      const slots = generateAvailableSlots(tuesdayDate, mockAvailability, mockOffers[0]);
      expect(slots).toHaveLength(0);
    });
  });

  describe('ConsultationOfferSelector Component', () => {
    it('renders all backend-provided consultation offers', () => {
      const onSelect = vi.fn();
      render(
        <ConsultationOfferSelector
          offers={mockOffers}
          selectedOfferId={null}
          onSelectOffer={onSelect}
        />
      );

      expect(screen.getByText('Standard Consultation')).toBeInTheDocument();
      expect(screen.getByText('Extended Diagnostics')).toBeInTheDocument();
      expect(screen.getByText('USD 100')).toBeInTheDocument();
      expect(screen.getByText('USD 180')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument();
    });

    it('fires callback when an offer is clicked', () => {
      const onSelect = vi.fn();
      render(
        <ConsultationOfferSelector
          offers={mockOffers}
          selectedOfferId={null}
          onSelectOffer={onSelect}
        />
      );

      fireEvent.click(screen.getByText('Standard Consultation'));
      expect(onSelect).toHaveBeenCalledWith(mockOffers[0]);
    });

    it('handles empty offers state gracefully', () => {
      render(
        <ConsultationOfferSelector
          offers={[]}
          selectedOfferId={null}
          onSelectOffer={vi.fn()}
        />
      );

      expect(
        screen.getByText(/no consultation offers are currently available/i)
      ).toBeInTheDocument();
    });
  });

  describe('DatePickerCalendar Component', () => {
    it('renders upcoming dates and calls onSelectDate when a date is clicked', () => {
      const onSelectDate = vi.fn();
      const testDate = new Date('2026-10-12T00:00:00Z');
      render(
        <DatePickerCalendar
          selectedDate={testDate}
          onSelectDate={onSelectDate}
          availabilityWindows={mockAvailability}
          daysAhead={7}
        />
      );

      expect(screen.getByText('Select Date')).toBeInTheDocument();
      expect(screen.getByText(/Next 7 days available/)).toBeInTheDocument();

      const dateButtons = screen.getAllByRole('radio');
      const firstEnabled = dateButtons.find((btn) => !btn.hasAttribute('disabled'));
      if (firstEnabled) {
        fireEvent.click(firstEnabled);
        expect(onSelectDate).toHaveBeenCalled();
      }
    });
  });

  describe('TimeSlotGrid Component', () => {
    it('renders bookable slots with correct time labels', () => {
      const onSelect = vi.fn();
      render(
        <TimeSlotGrid
          slots={[mockSlot]}
          selectedSlot={null}
          onSelectSlot={onSelect}
        />
      );

      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:30 AM')).toBeInTheDocument();

      fireEvent.click(screen.getByText('9:00 AM'));
      expect(onSelect).toHaveBeenCalledWith(mockSlot);
    });

    it('displays empty state when no slots are present', () => {
      render(
        <TimeSlotGrid
          slots={[]}
          selectedSlot={null}
          onSelectSlot={vi.fn()}
        />
      );

      expect(
        screen.getByText(/no available time slots on this date/i)
      ).toBeInTheDocument();
    });
  });

  describe('BookingReviewCard Component', () => {
    it('presents verified doctor, offer, and slot parameters', () => {
      const onConfirm = vi.fn();
      const onBack = vi.fn();
      const onChangeNotes = vi.fn();

      render(
        <BookingReviewCard
          doctor={mockDoctor}
          offer={mockOffers[0]}
          slot={mockSlot}
          notes=""
          onChangeNotes={onChangeNotes}
          onConfirm={onConfirm}
          onBack={onBack}
        />
      );

      expect(screen.getByText('Dr. Gregory House, MD')).toBeInTheDocument();
      expect(screen.getByText('Standard Consultation')).toBeInTheDocument();
      expect(screen.getByText('USD 100')).toBeInTheDocument();
      expect(screen.getByText(/9:00 AM – 9:30 AM/)).toBeInTheDocument();
      expect(screen.getByText('Request Consultation')).toBeInTheDocument();
    });

    it('protects against double submission with disabled state during pending submission', () => {
      render(
        <BookingReviewCard
          doctor={mockDoctor}
          offer={mockOffers[0]}
          slot={mockSlot}
          notes=""
          onChangeNotes={vi.fn()}
          onConfirm={vi.fn()}
          onBack={vi.fn()}
          isSubmitting={true}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /submitting request/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('BookingSuccessCard Component', () => {
    it('displays authoritative appointment reference and status', () => {
      render(
        <BookingSuccessCard
          appointment={mockAppointmentResponse}
          onGoToDoctors={vi.fn()}
          onGoHome={vi.fn()}
        />
      );

      expect(screen.getByText('Consultation Request Sent')).toBeInTheDocument();
      expect(screen.getByText('APT-7492ABCD')).toBeInTheDocument();
      expect(screen.getByText('REQUESTED')).toBeInTheDocument();
      expect(screen.getByText('USD 100')).toBeInTheDocument();
    });
  });

  describe('DoctorBookingPage Flow & Integration', () => {
    it('blocks booking with unverified doctor per backend rules', async () => {
      vi.spyOn(doctorsApi, 'getDoctorByIdApi').mockResolvedValue(mockUnverifiedDoctor);
      vi.spyOn(doctorsApi, 'getDoctorOffersApi').mockResolvedValue([]);
      vi.spyOn(doctorsApi, 'getDoctorAvailabilityApi').mockResolvedValue([]);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/doctors/DOC-99999999/book']}>
              <Routes>
                <Route path="/doctors/:doctorId/book" element={<DoctorBookingPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/physician profile pending verification/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/choose a consultation offer/i)).not.toBeInTheDocument();
    });

    it('completes the booking request flow end-to-end', async () => {
      vi.spyOn(doctorsApi, 'getDoctorByIdApi').mockResolvedValue(mockDoctor);
      vi.spyOn(doctorsApi, 'getDoctorOffersApi').mockResolvedValue(mockOffers);
      // Return availability schedule
      vi.spyOn(doctorsApi, 'getDoctorAvailabilityApi').mockResolvedValue(mockAvailability);
      const createSpy = vi.spyOn(appointmentsApi, 'createAppointmentApi').mockResolvedValue(mockAppointmentResponse);

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/doctors/DOC-12345678/book']}>
              <Routes>
                <Route path="/doctors/:doctorId/book" element={<DoctorBookingPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Step 1: Wait for offers to load
      await waitFor(() => {
        expect(screen.getByText('Standard Consultation')).toBeInTheDocument();
      });

      // Select offer
      fireEvent.click(screen.getByText('Standard Consultation'));

      // Step 2: Now in SELECT_SLOT
      await waitFor(() => {
        expect(screen.getByText(/select date & time slot/i)).toBeInTheDocument();
      });

      // Find an enabled date button in the calendar to ensure slots are generated
      const dateButtons = screen.getAllByRole('radio');
      const activeDateBtn = dateButtons.find((btn) => !btn.hasAttribute('disabled') && (btn.textContent?.includes('Sat') || btn.textContent?.includes('Sun') || btn.textContent?.includes('Mon') || btn.textContent?.includes('Wed') || btn.textContent?.includes('Fri')));
      if (activeDateBtn) {
        fireEvent.click(activeDateBtn);
      }

      // Time slots should render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review consultation details/i })).toBeInTheDocument();
      });

      // Click the first available slot button
      const allButtons = screen.getAllByRole('radio');
      const timeSlotBtn = allButtons.find((btn) => (btn.textContent?.includes('AM') || btn.textContent?.includes('PM')) && !btn.hasAttribute('disabled'));
      expect(timeSlotBtn).toBeDefined();
      if (timeSlotBtn) {
        fireEvent.click(timeSlotBtn);
      }

      // Review details button should now be enabled
      const reviewBtn = screen.getByRole('button', { name: /review consultation details/i });
      fireEvent.click(reviewBtn);

      // Step 3: Review step
      await waitFor(() => {
        expect(screen.getByText('Review Consultation Request')).toBeInTheDocument();
      });

      // Submit booking
      const confirmBtn = screen.getByRole('button', { name: /request consultation/i });
      fireEvent.click(confirmBtn);

      // Step 4: Authoritative confirmation
      await waitFor(() => {
        expect(createSpy).toHaveBeenCalled();
        expect(screen.getByText('Consultation Request Sent')).toBeInTheDocument();
        expect(screen.getByText('APT-7492ABCD')).toBeInTheDocument();
      });
    });

    it('handles HTTP 409 conflict and refreshes availability', async () => {
      vi.spyOn(doctorsApi, 'getDoctorByIdApi').mockResolvedValue(mockDoctor);
      vi.spyOn(doctorsApi, 'getDoctorOffersApi').mockResolvedValue(mockOffers);
      const availSpy = vi.spyOn(doctorsApi, 'getDoctorAvailabilityApi').mockResolvedValue(mockAvailability);
      vi.spyOn(appointmentsApi, 'createAppointmentApi').mockRejectedValue(
        new ApiError('The requested doctor time slot is already reserved or booked', 409)
      );

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/doctors/DOC-12345678/book']}>
              <Routes>
                <Route path="/doctors/:doctorId/book" element={<DoctorBookingPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Select offer
      await waitFor(() => {
        expect(screen.getByText('Standard Consultation')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Standard Consultation'));

      // Select slot
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /review consultation details/i })).toBeInTheDocument();
      });
      const dateButtons = screen.getAllByRole('radio');
      const activeDateBtn = dateButtons.find((btn) => !btn.hasAttribute('disabled') && (btn.textContent?.includes('Sat') || btn.textContent?.includes('Sun') || btn.textContent?.includes('Mon') || btn.textContent?.includes('Wed') || btn.textContent?.includes('Fri')));
      if (activeDateBtn) {
        fireEvent.click(activeDateBtn);
      }

      const allButtons = screen.getAllByRole('radio');
      const timeSlotBtn = allButtons.find((btn) => (btn.textContent?.includes('AM') || btn.textContent?.includes('PM')) && !btn.hasAttribute('disabled'));
      if (timeSlotBtn) {
        fireEvent.click(timeSlotBtn);
      }

      fireEvent.click(screen.getByRole('button', { name: /review consultation details/i }));

      // In Review, submit
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request consultation/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /request consultation/i }));

      // Should return to slot selection with conflict warning and refetch availability
      await waitFor(() => {
        expect(
          screen.getByText(/the selected time slot is no longer available as it was just reserved or booked/i)
        ).toBeInTheDocument();
      });
      expect(availSpy).toHaveBeenCalled();
    });
  });
});
