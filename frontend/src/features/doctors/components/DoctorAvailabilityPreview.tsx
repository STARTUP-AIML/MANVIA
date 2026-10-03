import React from 'react';
import type { DoctorAvailabilityWindow } from '@/types/doctors';

interface DoctorAvailabilityPreviewProps {
  availability: DoctorAvailabilityWindow[];
  isLoading: boolean;
}

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

function formatDayName(day: string): string {
  if (!day) return '';
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

function formatTime(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hoursStr, minutesStr] = time24.split(':');
  if (!hoursStr || !minutesStr) return time24;
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutesStr} ${ampm}`;
}

export const DoctorAvailabilityPreview: React.FC<DoctorAvailabilityPreviewProps> = ({
  availability,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        Loading physician schedule preview...
      </div>
    );
  }

  const sortedWindows = [...availability].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.dayOfWeek] || 99) - (DAY_ORDER[b.dayOfWeek] || 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const primaryTimezone = sortedWindows[0]?.timezone || 'UTC';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 4px 0',
            }}
          >
            Availability Schedule Preview
          </h3>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Physician timezone: <strong>{primaryTimezone}</strong>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#0284c7',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            padding: '4px 10px',
            borderRadius: '20px',
          }}
        >
          Phase 6 Preview Only
        </span>
      </div>

      {sortedWindows.length === 0 ? (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '13px',
          }}
        >
          No recurring consultation windows currently published by this physician.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {sortedWindows.map((win) => (
            <div
              key={win.id}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '4px',
                }}
              >
                {formatDayName(win.dayOfWeek)}
              </div>
              <div style={{ fontSize: '12px', color: '#096ed3', fontWeight: 600 }}>
                {formatTime(win.startTime)} – {formatTime(win.endTime)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scope Disclaimer */}
      <div
        style={{
          fontSize: '11px',
          color: '#64748b',
          backgroundColor: '#f8fafc',
          padding: '10px 14px',
          borderRadius: '8px',
          borderLeft: '3px solid #096ed3',
        }}
      >
        <strong>Note:</strong> This schedule is displayed for planning purposes. Consultation slot
        selection and direct booking will be available in Phase 7.
      </div>
    </div>
  );
};
