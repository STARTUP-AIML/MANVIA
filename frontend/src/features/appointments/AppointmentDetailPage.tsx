import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppointmentDetail, useCancelAppointment } from '@/hooks/useAppointments';
import { AppointmentStatusBadge } from '@/features/appointments/components/AppointmentStatusBadge';
import { CancelAppointmentModal } from '@/features/appointments/components/CancelAppointmentModal';
import { ApiError } from '@/api/client';

export const AppointmentDetailPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const {
    data: appointment,
    isLoading,
    isError,
    error,
    refetch,
  } = useAppointmentDetail(appointmentId);

  const cancelMutation = useCancelAppointment();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (isError || !appointment) {
    const isAuthError =
      error instanceof ApiError && (error.status === 401 || error.status === 403);
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-rose-800">
            {isAuthError ? 'Access Restricted' : 'Appointment Not Found'}
          </h2>
          <p className="text-sm text-rose-600">
            {error instanceof Error ? error.message : 'Could not locate the requested appointment record.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/appointments')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
          >
            Return to Appointments
          </button>
        </div>
      </div>
    );
  }

  const startDate = new Date(appointment.startAt);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startTimeStr = startDate.toLocaleTimeString('en-US', {
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

  const isCancellable =
    appointment.status === 'REQUESTED' ||
    appointment.status === 'CONFIRMED' ||
    appointment.status === 'RESERVED';

  const isPreConsultationPending =
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'DECLINED' &&
    appointment.status !== 'EXPIRED' &&
    (!appointment.hasPreConsultation || appointment.preConsultationStatus !== 'SUBMITTED');

  const handleConfirmCancel = async (reason: string) => {
    await cancelMutation.mutateAsync({
      appointmentId: appointment.id || appointment.publicAppointmentId,
      reason,
    });
    setActionSuccessMessage('Appointment has been successfully cancelled and the time slot released.');
    refetch();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/app/appointments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          &larr; Back to My Appointments
        </Link>
      </div>

      {actionSuccessMessage && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between">
          <span>{actionSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Appointment Details Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="font-mono text-xs text-slate-500 font-bold">
                {appointment.publicAppointmentId}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {appointment.offerTitle || 'Physician Consultation'}
            </h1>
          </div>

          {appointment.fee !== undefined && (
            <div className="sm:text-right bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Fee</span>
              <span className="text-xl font-bold text-teal-700">
                {appointment.currency} {appointment.fee}
              </span>
            </div>
          )}
        </div>

        {/* Schedule & Physician Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Physician</span>
            <p className="font-bold text-slate-900 text-base">
              {appointment.doctorDisplayName || 'Consulting Physician'}
            </p>
            {appointment.publicDoctorId && (
              <Link
                to={`/app/doctors/${appointment.publicDoctorId}`}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold underline block"
              >
                View Physician Profile
              </Link>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-semibold uppercase">Scheduled Time</span>
            <p className="font-bold text-slate-900 text-base">
              {formattedDate}
            </p>
            <p className="text-xs text-slate-600">
              {startTimeStr} – {endTimeStr} UTC ({appointment.durationMinutes || 30} minutes)
            </p>
          </div>
        </div>

        {/* Notes if provided */}
        {appointment.notes && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">
              Patient Intake Notes
            </span>
            <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {appointment.notes}
            </p>
          </div>
        )}

        {/* Cancellation Details if cancelled */}
        {appointment.status === 'CANCELLED' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <span className="text-xs font-bold text-rose-800 uppercase block">Cancellation Record</span>
            <p className="text-sm text-rose-900">
              Reason: {appointment.cancellationReason || 'Cancelled by patient schedule adjustment.'}
            </p>
            {appointment.cancelledAt && (
              <p className="text-xs text-rose-700">
                Timestamp: {new Date(appointment.cancelledAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Decline Details if declined */}
        {appointment.status === 'DECLINED' && (
          <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl space-y-1">
            <span className="text-xs font-bold text-stone-800 uppercase block">Declined Record</span>
            <p className="text-sm text-stone-900">
              Physician Note: {appointment.declineReason || 'The physician was unavailable to accept the consultation.'}
            </p>
          </div>
        )}
      </div>

      {/* Pre-Consultation Card Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pre-Consultation Clinical Intake
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your reason for visit, symptoms, and medical background for the physician.
            </p>
          </div>

          {!isPreConsultationPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Completed & Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              ○ Action Required
            </span>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Link
            to={`/appointments/${appointment.publicAppointmentId}/pre-consultation`}
            className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            {!isPreConsultationPending
              ? 'View Completed Intake'
              : 'Complete Pre-Consultation Intake'}
          </Link>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center justify-between pt-2">
        {isCancellable && (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="py-2.5 px-4 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
          >
            Cancel Appointment
          </button>
        )}

        <div className="ml-auto">
          <Link
            to="/app/appointments"
            className="py-2.5 px-5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-block"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Cancel Modal */}
      <CancelAppointmentModal
        isOpen={isCancelModalOpen}
        appointmentId={appointment.publicAppointmentId}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
        isSubmitting={cancelMutation.isPending}
      />
    </div>
  );
};
