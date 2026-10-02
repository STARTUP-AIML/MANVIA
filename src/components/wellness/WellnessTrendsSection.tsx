import { useState } from 'react';
import { useWellnessTrends } from '../../hooks/useWellness.js';
import { LoadingSpinner } from '../common/LoadingSpinner.js';
import { ErrorAlert } from '../common/ErrorAlert.js';
import { getUserTimezone, formatDurationMinutes } from '../../utils/date.js';

export function WellnessTrendsSection() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const timezone = getUserTimezone();

  const { data: trends, isLoading, isError, error, refetch } = useWellnessTrends({
    period,
    timezone,
  });

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div className="eyebrow">LONGITUDINAL ANALYSIS</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#073a78' }}>
            Wellness Trends & Observations
          </h2>
        </div>

        {/* Period Selector Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                border: 0,
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: period === p ? '#fff' : 'transparent',
                color: period === p ? '#096ed3' : '#64748b',
                boxShadow: period === p ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingSpinner message="Calculating trend metrics..." />}

      {isError && (
        <ErrorAlert
          title="Could not load wellness trends"
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {trends && !isLoading && (
        <>
          {!trends.hasSufficientData ? (
            <div
              style={{
                padding: '24px',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px dashed #cbd5e1',
                textAlign: 'center',
                margin: '12px 0',
              }}
            >
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📊</span>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#073a78' }}>
                Insufficient Data Points ({trends.totalCheckIns}/3)
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '440px', display: 'inline-block' }}>
                The backend requires a minimum of 3 check-ins within the selected {period} window before evaluating directional trend metrics.
              </p>
            </div>
          ) : (
            <div>
              {/* Average Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                {/* Mood */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Average Mood
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '6px 0 2px' }}>
                    {trends.averageMood !== null && trends.averageMood !== undefined
                      ? `${trends.averageMood.toFixed(1)} / 5`
                      : '—'}
                  </div>
                  {trends.previousPeriodComparison?.moodDelta !== undefined && trends.previousPeriodComparison?.moodDelta !== null && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: trends.previousPeriodComparison.moodDelta >= 0 ? '#166534' : '#991b1b',
                      }}
                    >
                      {trends.previousPeriodComparison.moodDelta >= 0 ? '▲ +' : '▼ '}
                      {trends.previousPeriodComparison.moodDelta.toFixed(1)} vs prev
                    </span>
                  )}
                </div>

                {/* Stress */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Average Stress
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '6px 0 2px' }}>
                    {trends.averageStress !== null && trends.averageStress !== undefined
                      ? `${trends.averageStress.toFixed(1)} / 5`
                      : '—'}
                  </div>
                  {trends.previousPeriodComparison?.stressDelta !== undefined && trends.previousPeriodComparison?.stressDelta !== null && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: trends.previousPeriodComparison.stressDelta <= 0 ? '#166534' : '#991b1b',
                      }}
                    >
                      {trends.previousPeriodComparison.stressDelta <= 0 ? '▼ ' : '▲ +'}
                      {trends.previousPeriodComparison.stressDelta.toFixed(1)} vs prev
                    </span>
                  )}
                </div>

                {/* Energy */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Average Energy
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '6px 0 2px' }}>
                    {trends.averageEnergy !== null && trends.averageEnergy !== undefined
                      ? `${trends.averageEnergy.toFixed(1)} / 5`
                      : '—'}
                  </div>
                  {trends.previousPeriodComparison?.energyDelta !== undefined && trends.previousPeriodComparison?.energyDelta !== null && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: trends.previousPeriodComparison.energyDelta >= 0 ? '#166534' : '#991b1b',
                      }}
                    >
                      {trends.previousPeriodComparison.energyDelta >= 0 ? '▲ +' : '▼ '}
                      {trends.previousPeriodComparison.energyDelta.toFixed(1)} vs prev
                    </span>
                  )}
                </div>

                {/* Sleep Quality */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Sleep Quality
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '6px 0 2px' }}>
                    {trends.averageSleepQuality !== null && trends.averageSleepQuality !== undefined
                      ? `${trends.averageSleepQuality.toFixed(1)} / 5`
                      : '—'}
                  </div>
                  {trends.previousPeriodComparison?.sleepQualityDelta !== undefined && trends.previousPeriodComparison?.sleepQualityDelta !== null && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: trends.previousPeriodComparison.sleepQualityDelta >= 0 ? '#166534' : '#991b1b',
                      }}
                    >
                      {trends.previousPeriodComparison.sleepQualityDelta >= 0 ? '▲ +' : '▼ '}
                      {trends.previousPeriodComparison.sleepQualityDelta.toFixed(1)} vs prev
                    </span>
                  )}
                </div>

                {/* Sleep Duration */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Avg Sleep Duration
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#073a78', margin: '6px 0 2px' }}>
                    {formatDurationMinutes(trends.averageSleepDurationMinutes)}
                  </div>
                  {trends.previousPeriodComparison?.sleepDurationMinutesDelta !== undefined && trends.previousPeriodComparison?.sleepDurationMinutesDelta !== null && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: trends.previousPeriodComparison.sleepDurationMinutesDelta >= 0 ? '#166534' : '#991b1b',
                      }}
                    >
                      {trends.previousPeriodComparison.sleepDurationMinutesDelta >= 0 ? '▲ +' : '▼ '}
                      {formatDurationMinutes(Math.abs(trends.previousPeriodComparison.sleepDurationMinutesDelta))} vs prev
                    </span>
                  )}
                </div>
              </div>

              {/* Descriptive Non-diagnostic Insights */}
              {trends.descriptiveInsights && trends.descriptiveInsights.length > 0 && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginTop: '16px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
                    Authoritative Observational Insights:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#1e3a8a', fontSize: '13px', lineHeight: 1.6 }}>
                    {trends.descriptiveInsights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '10px' }}>
                    * Observations are calculated mathematically from your self-reported logs and are purely descriptive.
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
