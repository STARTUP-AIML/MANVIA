import type { WellnessSummaryResponse } from '@/types/wellness';
import { formatDateTime } from '@/lib/date';

export function WellnessSummaryCards({
  summary,
  onOpenCheckIn,
}: {
  summary?: WellnessSummaryResponse;
  onOpenCheckIn: () => void;
}) {
  const streak = summary?.streakDays ?? 0;
  const total = summary?.totalCheckIns ?? 0;
  const todayCheckIn = summary?.todayCheckIn;
  const latestCheckIn = summary?.latestCheckIn;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* Streak Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #073a78, #0e56a8)',
          borderRadius: '20px',
          padding: '20px',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(7, 58, 120, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700 }}>
            Logging Streak
          </span>
          <span style={{ fontSize: '20px' }}>🔥</span>
        </div>
        <div style={{ margin: '14px 0 4px' }}>
          <span style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1 }}>{streak}</span>
          <span style={{ fontSize: '14px', marginLeft: '6px', opacity: 0.85 }}>days</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px', opacity: 0.75 }}>
          {streak > 0
            ? 'Consistent check-ins help track daily trends accurately.'
            : 'Start your streak today by logging your first check-in.'}
        </p>
      </div>

      {/* Total Check-ins Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            Total Check-ins
          </span>
          <span style={{ fontSize: '20px', color: '#096ed3' }}>◌</span>
        </div>
        <div style={{ margin: '14px 0 4px' }}>
          <span style={{ fontSize: '38px', fontWeight: 800, color: '#073a78', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: '14px', marginLeft: '6px', color: '#64748b' }}>lifetime</span>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
          {total >= 3
            ? 'Sufficient records available for longitudinal analysis.'
            : `${3 - total > 0 ? 3 - total : 0} more check-ins needed to unlock 7d trend metrics.`}
        </p>
      </div>

      {/* Today's Check-in Status */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            Today's Check-in
          </span>
          <span
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '10px',
              fontWeight: 700,
              background: todayCheckIn ? '#dcfce7' : '#fef3c7',
              color: todayCheckIn ? '#166534' : '#92400e',
            }}
          >
            {todayCheckIn ? 'Completed' : 'Pending'}
          </span>
        </div>
        {todayCheckIn ? (
          <div style={{ margin: '10px 0' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', fontWeight: 700, color: '#073a78' }}>
              <span>Mood: {todayCheckIn.mood}/5</span>
              <span>Stress: {todayCheckIn.stress}/5</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>
              Recorded at {formatDateTime(todayCheckIn.recordedAt)}
            </p>
          </div>
        ) : (
          <div style={{ margin: '10px 0' }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
              You haven't logged today's wellness check-in yet.
            </p>
            <button
              type="button"
              onClick={onOpenCheckIn}
              className="primary small"
              style={{ width: '100%', textAlign: 'center', padding: '8px' }}
            >
              Log Today's Check-in
            </button>
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
          Reflects local date status
        </div>
      </div>

      {/* Latest Record Snapshot */}
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
            Latest Check-in
          </span>
          <span style={{ fontSize: '14px', color: '#096ed3' }}>◷</span>
        </div>
        {latestCheckIn ? (
          <div>
            <div style={{ fontSize: '12px', color: '#475569', margin: '8px 0' }}>
              <div><strong>Energy:</strong> {latestCheckIn.energy}/5 • <strong>Sleep:</strong> {latestCheckIn.sleepQuality}/5</div>
              {latestCheckIn.sleepDurationMinutes ? (
                <div style={{ marginTop: '2px' }}>
                  <strong>Duration:</strong> {Math.floor(latestCheckIn.sleepDurationMinutes / 60)}h {latestCheckIn.sleepDurationMinutes % 60}m
                </div>
              ) : null}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              {formatDateTime(latestCheckIn.recordedAt)}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '14px 0' }}>
            No prior check-ins recorded
          </p>
        )}
        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
          Patient subjective assessment
        </div>
      </div>
    </div>
  );
}
