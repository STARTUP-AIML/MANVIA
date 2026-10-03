import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import type { AppointmentResponseDto } from '@/types/appointments';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';

interface AppointmentCardProps {
  appointment: AppointmentResponseDto;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  const startDate = new Date(appointment.startAt);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
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

  const isPreConsultationPending =
    appointment.status !== 'CANCELLED' &&
    appointment.status !== 'DECLINED' &&
    appointment.status !== 'EXPIRED' &&
    (!appointment.hasPreConsultation || appointment.preConsultationStatus !== 'SUBMITTED');

  return (
    <div className="appointments-card-glass flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="space-y-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <AppointmentStatusBadge status={appointment.status} />
          <span className="font-mono text-xs text-slate-500 font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60">
            {appointment.publicAppointmentId}
          </span>
          {appointment.hasPreConsultation && appointment.preConsultationStatus === 'SUBMITTED' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              ✓ Pre-consultation complete
            </span>
          ) : isPreConsultationPending ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200/80">
              ○ Pre-consultation intake needed
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 truncate">
            {appointment.doctorDisplayName || 'Consulting Physician'}
          </h3>
          <p className="text-sm text-slate-600">
            {appointment.offerTitle || 'General Consultation'}
            {appointment.durationMinutes ? ` • ${appointment.durationMinutes} minutes` : ''}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-white/60 px-2 py-1 rounded-lg border border-slate-200/50">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700 bg-white/60 px-2 py-1 rounded-lg border border-slate-200/50">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {startTimeStr} – {endTimeStr} UTC
          </span>
          {appointment.fee !== undefined && (
            <span className="font-semibold text-slate-800 bg-blue-50/80 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200/60">
              {appointment.currency} {appointment.fee}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
        {isPreConsultationPending && (
          <Link
            to={`/appointments/${appointment.publicAppointmentId}/pre-consultation`}
            className="py-2.5 px-4 bg-teal-50/90 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-xl text-xs font-semibold transition-all shadow-sm hover:shadow"
          >
            Fill Intake
          </Link>
        )}
        <Link
          to={`/appointments/${appointment.publicAppointmentId}`}
          className="py-2.5 px-5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm hover:shadow inline-flex items-center gap-1.5"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 opacity-80" />
        </Link>
      </div>
    </div>
  );
};

