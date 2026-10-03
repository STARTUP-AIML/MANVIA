import type { TimelineEventType } from '@/types/timeline';

export interface TimelineFilterOption {
  label: string;
  value: TimelineEventType | 'ALL';
  icon: string;
}

const FILTER_OPTIONS: TimelineFilterOption[] = [
  { label: 'All Activity', value: 'ALL', icon: '✦' },
  { label: 'Wellness Check-ins', value: 'WELLNESS_CHECK_IN', icon: '◌' },
  { label: 'Health Records', value: 'HEALTH_RECORD_ADDED', icon: '▥' },
  { label: 'Appointments', value: 'APPOINTMENT', icon: '▣' },
  { label: 'Consultations', value: 'CONSULTATION', icon: '♧' },
  { label: 'Other Events', value: 'OTHER', icon: '⌁' },
];

export function TimelineFilterBar({
  selected,
  onSelect,
}: {
  selected: TimelineEventType | 'ALL';
  onSelect: (val: TimelineEventType | 'ALL') => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Timeline event filters"
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 0 16px',
        scrollbarWidth: 'thin',
      }}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onSelect(opt.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: isSelected ? '1px solid #0ba9e7' : '1px solid #e2e8f0',
              background: isSelected ? '#eff6ff' : '#fff',
              color: isSelected ? '#0369a1' : '#64748b',
              cursor: 'pointer',
              boxShadow: isSelected ? '0 2px 8px rgba(11, 169, 231, 0.15)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
