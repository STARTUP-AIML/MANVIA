import React from 'react';
import type { AppointmentStatus } from '../../types/appointments.js';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
          role="status"
          aria-label={`Status: Confirmed`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Confirmed
        </span>
      );

    case 'REQUESTED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
          role="status"
          aria-label={`Status: Waiting for doctor confirmation`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          Waiting for Doctor Confirmation
        </span>
      );

    case 'RESERVED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
          role="status"
          aria-label={`Status: Temporarily reserved`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
          Reserved
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
          role="status"
          aria-label={`Status: In progress`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" aria-hidden="true" />
          In Progress
        </span>
      );

    case 'COMPLETED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
          role="status"
          aria-label={`Status: Completed`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          Completed
        </span>
      );

    case 'CANCELLED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
          role="status"
          aria-label={`Status: Cancelled`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
          Cancelled
        </span>
      );

    case 'DECLINED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300"
          role="status"
          aria-label={`Status: Doctor declined`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500" aria-hidden="true" />
          Doctor Declined
        </span>
      );

    case 'EXPIRED':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200"
          role="status"
          aria-label={`Status: Expired`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
          Expired
        </span>
      );

    case 'NO_SHOW':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
          role="status"
          aria-label={`Status: No-show`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          No-Show
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
};
