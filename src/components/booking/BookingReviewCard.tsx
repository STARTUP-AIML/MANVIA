import React from 'react';
import type { DoctorPublic, DoctorConsultationOffer } from '../../types/doctors.js';
import type { CalculatedTimeSlot } from '../../types/appointments.js';

interface BookingReviewCardProps {
  doctor: DoctorPublic;
  offer: DoctorConsultationOffer;
  slot: CalculatedTimeSlot;
  notes: string;
  onChangeNotes: (notes: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const BookingReviewCard: React.FC<BookingReviewCardProps> = ({
  doctor,
  offer,
  slot,
  notes,
  onChangeNotes,
  onConfirm,
  onBack,
  isSubmitting = false,
  errorMessage,
}) => {
  const slotDate = new Date(slot.startAt);
  const formattedDate = slotDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-xl font-bold text-slate-900">
          Review Consultation Request
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Please verify your consultation details before submitting.
        </p>
      </div>

      {/* Review Details Table/Grid */}
      <div className="space-y-4 text-sm divide-y divide-slate-100">
        <div className="pt-2 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Doctor</span>
          <span className="font-semibold text-slate-900 text-right">
            {doctor.displayName}
            {doctor.primarySpecialty && (
              <span className="block text-xs font-normal text-slate-500">
                {doctor.primarySpecialty}
              </span>
            )}
          </span>
        </div>

        <div className="pt-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Consultation</span>
          <span className="font-semibold text-slate-900 text-right">
            {offer.title}
            <span className="block text-xs font-normal text-slate-500">
              {offer.durationMinutes} minutes
            </span>
          </span>
        </div>

        <div className="pt-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Date</span>
          <span className="font-semibold text-slate-900 text-right">
            {formattedDate}
          </span>
        </div>

        <div className="pt-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Time</span>
          <span className="font-semibold text-slate-900 text-right">
            {slot.displayTime} – {slot.displayEndTime} (UTC)
          </span>
        </div>

        <div className="pt-3 flex justify-between items-center">
          <span className="text-slate-500 font-medium">Consultation Fee</span>
          <span className="text-base font-bold text-teal-700 text-right">
            {offer.currency} {offer.fee}
          </span>
        </div>
      </div>

      {/* Notes / Reason input (Backend supports optional notes, max 500 chars) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <label htmlFor="appointment-notes" className="text-sm font-semibold text-slate-900 block">
          Notes for the Doctor (Optional)
        </label>
        <textarea
          id="appointment-notes"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value.slice(0, 500))}
          placeholder="Briefly describe your symptoms or reason for visit (max 500 characters)"
          rows={3}
          maxLength={500}
          disabled={isSubmitting}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 resize-none"
        />
        <div className="text-right text-xs text-slate-400">
          {notes.length} / 500
        </div>
      </div>

      {/* Error alert if submission failed */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3"
        >
          <svg className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold">Unable to complete request</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Action buttons with double-submission protection */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 transition-colors"
        >
          Back to Slots
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:bg-teal-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Submitting Request...</span>
            </>
          ) : (
            <span>Request Consultation</span>
          )}
        </button>
      </div>
    </div>
  );
};
