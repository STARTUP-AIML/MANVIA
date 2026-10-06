import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useAppointmentDetail,
  usePreConsultation,
  useSaveDraftPreConsultation,
  useSubmitPreConsultation,
} from '@/hooks/useAppointments';
import { PreConsultationForm } from '@/features/appointments/components/PreConsultationForm';
import type { PreConsultationDraftDto } from '@/types/appointments';

export const PreConsultationPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: appointment,
    isLoading: isLoadingAppointment,
    isError: isAppointmentError,
    error: appointmentError,
  } = useAppointmentDetail(appointmentId);

  const {
    data: preConsultation,
    isLoading: isLoadingPreConsultation,
    refetch: refetchPreConsultation,
  } = usePreConsultation(appointment?.id || appointmentId);

  const saveDraftMutation = useSaveDraftPreConsultation();
  const submitMutation = useSubmitPreConsultation();

  if (isLoadingAppointment || isLoadingPreConsultation) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-96 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (isAppointmentError || !appointment) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold text-rose-800">Appointment Not Found</h2>
          <p className="text-sm text-rose-600">
            {appointmentError instanceof Error ? appointmentError.message : 'Could not locate the associated appointment.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/appointments')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  const isLocked = preConsultation?.status === 'SUBMITTED' || preConsultation?.status === 'REVIEWED';

  const handleSaveDraft = async (dto: PreConsultationDraftDto) => {
    setErrorMessage(null);
    setSuccessToast(null);
    try {
      await saveDraftMutation.mutateAsync({
        appointmentId: appointment.id || appointment.publicAppointmentId,
        dto,
      });
      setSuccessToast('Draft saved successfully. You may continue editing at any time before consultation.');
      refetchPreConsultation();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save draft. Please try again.');
    }
  };

  const handleSubmitIntake = async (dto: PreConsultationDraftDto) => {
    setErrorMessage(null);
    setSuccessToast(null);
    try {
      // 1. Save latest draft first to guarantee backend receives all answers
      await saveDraftMutation.mutateAsync({
        appointmentId: appointment.id || appointment.publicAppointmentId,
        dto,
      });
      // 2. Submit and lock
      await submitMutation.mutateAsync(appointment.id || appointment.publicAppointmentId);
      setSuccessToast('Pre-consultation intake submitted and locked for physician review.');
      refetchPreConsultation();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit pre-consultation. Please verify your inputs.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/app/appointments/${appointment.publicAppointmentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          &larr; Back to Appointment ({appointment.publicAppointmentId})
        </Link>
      </div>

      {/* Header Info */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Pre-Consultation Clinical Intake
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consultation with <span className="font-semibold text-slate-800">{appointment.doctorDisplayName || 'Doctor'}</span>
          {appointment.offerTitle ? ` • ${appointment.offerTitle}` : ''}
        </p>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center justify-between">
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Intake Form */}
      <PreConsultationForm
        initialData={preConsultation}
        onSaveDraft={handleSaveDraft}
        onSubmitIntake={handleSubmitIntake}
        isSavingDraft={saveDraftMutation.isPending}
        isSubmitting={submitMutation.isPending}
        isLocked={isLocked}
        errorMessage={errorMessage}
      />
    </div>
  );
};
