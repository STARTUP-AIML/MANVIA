import type { TimelineEventResponse, TimelineEventType } from '../../types/timeline.js';
import { formatDateTime } from '../../utils/date.js';

interface TypeConfig {
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  label: string;
  icon: string;
}

const TYPE_CONFIGS: Record<TimelineEventType, TypeConfig> = {
  WELLNESS_CHECK_IN: {
    badgeBg: '#f0fdf4',
    badgeColor: '#15803d',
    badgeBorder: '#bbf7d0',
    label: 'Wellness Check-in',
    icon: '◌',
  },
  HEALTH_RECORD_ADDED: {
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    badgeBorder: '#bfdbfe',
    label: 'Health Record',
    icon: '▥',
  },
  APPOINTMENT: {
    badgeBg: '#faf5ff',
    badgeColor: '#7e22ce',
    badgeBorder: '#e9d5ff',
    label: 'Appointment',
    icon: '▣',
  },
  CONSULTATION: {
    badgeBg: '#fff7ed',
    badgeColor: '#c2410c',
    badgeBorder: '#fed7aa',
    label: 'Consultation',
    icon: '♧',
  },
  OTHER: {
    badgeBg: '#f8fafc',
    badgeColor: '#475569',
    badgeBorder: '#e2e8f0',
    label: 'Health Event',
    icon: '✦',
  },
};

export function TimelineEventCard({ event }: { event: TimelineEventResponse }) {
  const config = TYPE_CONFIGS[event.eventType] || TYPE_CONFIGS.OTHER;

  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: '32px',
        paddingBottom: '28px',
      }}
    >
      {/* Node Dot / Icon */}
      <div
        style={{
          position: 'absolute',
          left: '0',
          top: '4px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: config.badgeBg,
          border: `2px solid ${config.badgeBorder}`,
          color: config.badgeColor,
          display: 'grid',
          placeItems: 'center',
          fontSize: '13px',
          fontWeight: 800,
          zIndex: 2,
        }}
      >
        {config.icon}
      </div>

      {/* Card Body */}
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '8px',
                background: config.badgeBg,
                color: config.badgeColor,
                border: `1px solid ${config.badgeBorder}`,
              }}
            >
              {config.label}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              {event.publicEventId}
            </span>
          </div>

          <time
            dateTime={event.eventTimestamp}
            style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}
          >
            {formatDateTime(event.eventTimestamp)}
          </time>
        </div>

        <h3
          style={{
            fontSize: '15px',
            fontWeight: 700,
            margin: '6px 0 4px',
            color: '#073a78',
          }}
        >
          {event.title}
        </h3>

        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
          {event.summary}
        </p>

        {/* Metadata / Source tags */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
          <span>
            <strong>Source:</strong> {event.sourceType}
          </span>
          {event.sourceId && (
            <span>
              <strong>Ref ID:</strong> <span style={{ fontFamily: 'monospace' }}>{event.sourceId}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
