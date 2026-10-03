import React from 'react';
import type { CalculatedTimeSlot } from '@/types/appointments';

interface TimeSlotGridProps {
  slots: CalculatedTimeSlot[];
  selectedSlot: CalculatedTimeSlot | null;
  onSelectSlot: (slot: CalculatedTimeSlot) => void;
  isLoading?: boolean;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" aria-busy="true" aria-label="Loading available time slots">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-slate-600 text-sm font-medium">
          No available time slots on this date. Please select another date.
        </p>
      </div>
    );
  }

  const bookableSlots = slots.filter((s) => s.isBookable);

  if (bookableSlots.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-slate-600 text-sm font-medium">
          All slots for today have already passed. Please select an upcoming date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900 block">
        Available Times
      </label>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
        role="radiogroup"
        aria-label="Available Time Slots"
      >
        {slots.map((slot) => {
          const isSelected = selectedSlot?.startAt === slot.startAt;
          const isBookable = slot.isBookable && slot.status === 'AVAILABLE';

          return (
            <button
              key={slot.startAt}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!isBookable}
              onClick={() => onSelectSlot(slot)}
              className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center justify-center ${
                isSelected
                  ? 'border-teal-600 bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20'
                  : isBookable
                  ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed line-through'
              }`}
            >
              <span>{slot.displayTime}</span>
              <span
                className={`text-[10px] font-normal ${
                  isSelected ? 'text-teal-100' : isBookable ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {slot.displayEndTime}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
