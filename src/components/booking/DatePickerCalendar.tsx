import React from 'react';
import type { DoctorAvailabilityWindow } from '../../types/doctors.js';
import { isDateAvailableForDoctor, formatDateToYYYYMMDD } from '../../utils/slotCalculation.js';

interface DatePickerCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  availabilityWindows: DoctorAvailabilityWindow[];
  daysAhead?: number;
}

export const DatePickerCalendar: React.FC<DatePickerCalendarProps> = ({
  selectedDate,
  onSelectDate,
  availabilityWindows,
  daysAhead = 14,
}) => {
  // Generate list of dates starting from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  const selectedDateStr = formatDateToYYYYMMDD(selectedDate);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-900">
          Select Date
        </label>
        <span className="text-xs text-slate-500">
          Next {daysAhead} days available
        </span>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200"
        role="radiogroup"
        aria-label="Available Dates"
      >
        {dates.map((date) => {
          const dateStr = formatDateToYYYYMMDD(date);
          const isSelected = dateStr === selectedDateStr;
          const isAvailable = isDateAvailableForDoctor(date, availabilityWindows);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = date.getDate();
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });

          return (
            <button
              key={dateStr}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!isAvailable}
              onClick={() => onSelectDate(date)}
              className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-xl border text-center transition-all shrink-0 ${
                isSelected
                  ? 'border-teal-600 bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/20'
                  : isAvailable
                  ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span
                className={`text-xs font-medium uppercase tracking-wider ${
                  isSelected ? 'text-teal-100' : isAvailable ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {dayName}
              </span>
              <span className="text-lg font-bold my-0.5">
                {dayNum}
              </span>
              <span
                className={`text-xs ${
                  isSelected ? 'text-teal-100' : isAvailable ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {monthName}
              </span>
              {!isAvailable && (
                <span className="text-[10px] text-slate-400 mt-1">Off</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
