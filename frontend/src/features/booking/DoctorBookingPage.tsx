import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDoctorDetail, useDoctorOffers, useDoctorAvailability } from '@/hooks/useDoctors';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useAuth } from '@/auth/AuthContext';
import { ConsultationOfferSelector } from '@/features/booking/components/ConsultationOfferSelector';
import { DatePickerCalendar } from '@/features/booking/components/DatePickerCalendar';
import { TimeSlotGrid } from '@/features/booking/components/TimeSlotGrid';
import { BookingReviewCard } from '@/features/booking/components/BookingReviewCard';
import { BookingSuccessCard } from '@/features/booking/components/BookingSuccessCard';
import { generateAvailableSlots } from '@/lib/slotCalculation';
import { ApiError } from '@/api/client';
import type { DoctorConsultationOffer } from '@/types/doctors';
import type { CalculatedTimeSlot, AppointmentResponseDto } from '@/types/appointments';

type BookingStep = 'SELECT_OFFER' | 'SELECT_SLOT' | 'REVIEW' | 'CONFIRMED';

export const DoctorBookingPage: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const {
    data: doctor,
    isLoading: isDoctorLoading,
    error: doctorError,
  } = useDoctorDetail(doctorId);

  const {
    data: offers = [],
    isLoading: isOffersLoading,
  } = useDoctorOffers(doctorId);

  const {
    data: availability = [],
    isLoading: isAvailabilityLoading,
    refetch: refetchAvailability,
  } = useDoctorAvailability(doctorId);

  const createAppointmentMutation = useCreateAppointment();

  // State
  const [selectedOffer, setSelectedOffer] = useState<DoctorConsultationOffer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    // Default to tomorrow to ensure bookable daytime slots are reliably in the future
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState<CalculatedTimeSlot | null>(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [currentStep, setCurrentStep] = useState<BookingStep>('SELECT_OFFER');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [createdAppointment, setCreatedAppointment] = useState<AppointmentResponseDto | null>(null);

  // Sync initial offer from URL query if provided
  React.useEffect(() => {
    const offerIdParam = searchParams.get('offerId');
    if (offerIdParam && offers.length > 0 && !selectedOffer) {
      const match = offers.find((o) => o.id === offerIdParam);
      if (match) {
        setSelectedOffer(match);
        setCurrentStep('SELECT_SLOT');
      }
    }
  }, [offers, searchParams, selectedOffer]);

  // Compute available slots
  const availableSlots = useMemo(() => {
    if (!selectedOffer) return [];
    return generateAvailableSlots(selectedDate, availability, selectedOffer);
  }, [selectedDate, availability, selectedOffer]);

  const handleSelectOffer = (offer: DoctorConsultationOffer) => {
    setSelectedOffer(offer);
    setSelectedSlot(null);
    setConflictWarning(null);
    setSubmissionError(null);
    setSearchParams({ offerId: offer.id });
    setCurrentStep('SELECT_SLOT');
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setConflictWarning(null);
  };

  const handleSelectSlot = (slot: CalculatedTimeSlot) => {
    setSelectedSlot(slot);
    setConflictWarning(null);
    setSubmissionError(null);
  };

  const handleProceedToReview = () => {
    if (!selectedOffer || !selectedSlot) return;
    setSubmissionError(null);
    setCurrentStep('REVIEW');
  };

  const handleConfirmBooking = async () => {
    if (!doctor || !selectedOffer || !selectedSlot) return;

    setSubmissionError(null);
    setConflictWarning(null);

    try {
      const result = await createAppointmentMutation.mutateAsync({
        doctorId: doctor.publicDoctorId,
        consultationOfferId: selectedOffer.id,
        startAt: selectedSlot.startAt,
        notes: patientNotes.trim() ? patientNotes.trim() : undefined,
      });

      setCreatedAppointment(result);
      setCurrentStep('CONFIRMED');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Race condition / slot conflict
          setConflictWarning(
            'The selected time slot is no longer available as it was just reserved or booked by another patient. Please select another slot.'
          );
          setSelectedSlot(null);
          setCurrentStep('SELECT_SLOT');
          // Invalidate/refetch availability
          refetchAvailability();
          return;
        }

        if (err.status === 400) {
          setSubmissionError(
            err.message || 'Invalid appointment parameters. Please verify your selected slot and notes.'
          );
          return;
        }

        if (err.status === 404) {
          setSubmissionError('The selected doctor or consultation offer was not found.');
          return;
        }

        setSubmissionError(err.message || 'An unexpected error occurred while booking. Please try again.');
      } else {
        setSubmissionError('Network error. Please check your connection and try again.');
      }
    }
  };

  const { user } = useAuth();

  // If user is authenticated with a non-patient role (e.g. DOCTOR, ADMIN), block patient booking actions
  if (user && user.roles && !user.roles.includes('PATIENT')) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 mt-2">
            Physician consultation booking is only accessible to authenticated patient accounts.
          </p>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm"
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isDoctorLoading || isOffersLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  // Doctor or Offer error state
  if (doctorError || !doctor) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl">
          <h2 className="text-lg font-bold text-rose-800">Doctor Not Found</h2>
          <p className="text-sm text-rose-600 mt-2">
            The physician you are attempting to book with does not exist or has been deactivated.
          </p>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm"
          >
            Find Another Doctor
          </button>
        </div>
      </div>
    );
  }

  // Check if doctor is verified (Backend requires VERIFIED)
  const isVerified = doctor.verificationStatus === 'VERIFIED';

  if (!isVerified) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-amber-900">Physician Profile Pending Verification</h2>
          <p className="text-sm text-amber-800 mt-2">
            Appointments cannot be booked with physicians whose clinical verification is currently in progress.
          </p>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="mt-5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-sm"
          >
            Explore Verified Doctors
          </button>
        </div>
      </div>
    );
  }

  // If already confirmed
  if (currentStep === 'CONFIRMED' && createdAppointment) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <BookingSuccessCard
          appointment={createdAppointment}
          onGoToDoctors={() => navigate('/doctors')}
          onGoHome={() => navigate('/')}
          onViewAppointments={() => navigate('/appointments')}
          onViewDetails={() => navigate(`/appointments/${createdAppointment.id}`)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Doctor Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/doctors/${doctor.publicDoctorId}`)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Back to Doctor Profile"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Book with {doctor.displayName}
            </h1>
            <p className="text-sm text-slate-500">
              {doctor.primarySpecialty || 'General Practitioner'} • Real Doctor Care
            </p>
          </div>
        </div>
      </div>

      {/* Conflict / Race condition banner */}
      {conflictWarning && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3"
        >
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{conflictWarning}</p>
        </div>
      )}

      {/* Step Flow */}
      {currentStep === 'SELECT_OFFER' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Step 1: Choose a Consultation Offer
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select the type of consultation and duration for your visit.
            </p>
          </div>

          <ConsultationOfferSelector
            offers={offers}
            selectedOfferId={selectedOffer?.id || null}
            onSelectOffer={handleSelectOffer}
            isLoading={isOffersLoading}
          />
        </div>
      )}

      {currentStep === 'SELECT_SLOT' && selectedOffer && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block uppercase font-semibold">Selected Offer</span>
              <span className="text-sm font-bold text-slate-900">
                {selectedOffer.title} ({selectedOffer.durationMinutes} min)
              </span>
              <span className="text-xs text-slate-600 ml-2">
                {selectedOffer.currency} {selectedOffer.fee}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep('SELECT_OFFER')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 underline"
            >
              Change Offer
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Step 2: Select Date & Time Slot
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Choose an available appointment slot matching the doctor's published schedule.
            </p>
          </div>

          <DatePickerCalendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            availabilityWindows={availability}
          />

          <TimeSlotGrid
            slots={availableSlots}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            isLoading={isAvailabilityLoading}
          />

          {/* Continue button */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={handleProceedToReview}
              className="py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
            >
              Review Consultation Details
            </button>
          </div>
        </div>
      )}

      {currentStep === 'REVIEW' && selectedOffer && selectedSlot && (
        <div className="space-y-6">
          <BookingReviewCard
            doctor={doctor}
            offer={selectedOffer}
            slot={selectedSlot}
            notes={patientNotes}
            onChangeNotes={setPatientNotes}
            onConfirm={handleConfirmBooking}
            onBack={() => setCurrentStep('SELECT_SLOT')}
            isSubmitting={createAppointmentMutation.isPending}
            errorMessage={submissionError}
          />
        </div>
      )}
    </div>
  );
};
