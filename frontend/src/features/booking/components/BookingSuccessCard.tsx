import React from 'react';
import type { AppointmentResponseDto } from '@/types/appointments';

interface BookingSuccessCardProps {
  appointment: AppointmentResponseDto;
  onGoToDoctors: () => void;
  onGoHome: () => void;
  onViewAppointments?: () => void;
  onViewDetails?: () => void;
}

export const BookingSuccessCard: React.FC<BookingSuccessCardProps> = ({
  appointment,
  onGoToDoctors,
  onGoHome,
  onViewAppointments,
  onViewDetails,
}) => {
  const slotDate = new Date(appointment.startAt);
  const formattedDate = slotDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startTimeStr = slotDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const endDate = new Date(appointment.endAt);
  const endTimeStr = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const isConfirmed = appointment.status === 'CONFIRMED';
  const isRequested = appointment.status === 'REQUESTED';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-lg mx-auto text-center space-y-6">
      <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center mx-auto text-teal-600">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {isConfirmed ? 'Consultation Confirmed' : 'Consultation Request Sent'}
        </h2>
        <p className="text-slate-600 text-sm mt-1">
          {isRequested
            ? 'Your booking request has been sent to the doctor. You will receive an update once confirmed.'
            : 'Your consultation is confirmed and scheduled on your care calendar.'}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Reference ID</span>
          <span className="font-mono font-bold text-slate-900">
            {appointment.publicAppointmentId}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Status</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              isConfirmed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {appointment.status}
          </span>
        </div>

        {appointment.doctorDisplayName && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Doctor</span>
            <span className="font-semibold text-slate-900">
              {appointment.doctorDisplayName}
            </span>
          </div>
        )}

        {appointment.offerTitle && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Consultation</span>
            <span className="font-semibold text-slate-900">
              {appointment.offerTitle}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-medium">Date & Time</span>
          <span className="font-semibold text-slate-900 text-right">
            {formattedDate}
            <span className="block text-xs font-normal text-slate-500">
              {startTimeStr} – {endTimeStr} UTC
            </span>
          </span>
        </div>

        {appointment.fee !== undefined && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Fee</span>
            <span className="font-bold text-teal-700">
              {appointment.currency} {appointment.fee}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {onViewDetails ? (
          <button
            type="button"
            onClick={onViewDetails}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            View Appointment Details
          </button>
        ) : onViewAppointments ? (
          <button
            type="button"
            onClick={onViewAppointments}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            View My Appointments
          </button>
        ) : null}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onGoToDoctors}
            className="flex-1 py-3 px-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Discover More Doctors
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};
