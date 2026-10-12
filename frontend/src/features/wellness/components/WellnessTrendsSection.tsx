import { useState, useMemo, useContext } from 'react';
import { useWellnessTrends, useWellnessCheckIns } from '@/hooks/useWellness';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getUserTimezone, formatDurationMinutes } from '@/lib/date';
import { I18nContext } from '@/i18n/i18nContext';
import type { WellnessCheckInResponse } from '@/types/wellness';

export function WellnessTrendsSection() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [activeTooltip, setActiveTooltip] = useState<{
    chart: 'trajectory' | 'sleep';
    x: number;
    y: number;
    title: string;
    text: string;
  } | null>(null);

  const timezone = getUserTimezone();
  const i18n = useContext(I18nContext);
  const language = i18n?.language;

  const locale = useMemo(() => {
    switch (language) {
      case 'te':
        return 'te-IN';
      case 'hi':
        return 'hi-IN';
      case 'kn':
        return 'kn-IN';
      default:
        return 'en-US';
    }
  }, [language]);

  const { data: trends, isLoading, isError, error, refetch } = useWellnessTrends({
    period,
    timezone,
  });

  const { data: checkInsData } = useWellnessCheckIns({
    period,
    limit: 100,
    timezone,
  });

  const checkIns = useMemo(() => {
    const list = checkInsData?.data || [];
    return [...list].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }, [checkInsData]);

  const formatShortDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
      }).format(new Date(dateString));
    } catch {
      return new Date(dateString).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeZone: timezone,
      }).format(new Date(dateString));
    } catch {
      return new Date(dateString).toLocaleDateString(locale, { dateStyle: 'medium' });
    }
  };

  /**
   * Builds discontinuous SVG path segments so missing observations
   * produce genuine line gaps rather than dropping to zero or interpolating across gaps.
   */
  const buildDiscontinuousPath = (
    items: WellnessCheckInResponse[],
    getValue: (c: WellnessCheckInResponse) => number | null | undefined,
    getX: (index: number) => number,
    getY: (val: number) => number,
  ): string[] => {
    const segments: string[] = [];
    let currentSegment: string[] = [];

    items.forEach((c, i) => {
      const val = getValue(c);
      if (val !== null && val !== undefined && !isNaN(val) && val >= 1 && val <= 5) {
        const x = getX(i);
        const y = getY(val);
        if (currentSegment.length === 0) {
          currentSegment.push(`M ${x} ${y}`);
        } else {
          currentSegment.push(`L ${x} ${y}`);
        }
      } else {
        if (currentSegment.length > 1) {
          segments.push(currentSegment.join(' '));
        }
        currentSegment = [];
      }
    });

    if (currentSegment.length > 1) {
      segments.push(currentSegment.join(' '));
    }

    return segments;
  };

  const chartWidth = Math.max(500, checkIns.length * 60);

  const getStep = (total: number) => (chartWidth - 80) / Math.max(1, total - 1);
  const getX = (index: number, total: number) => 50 + index * getStep(total);
  const getY = (val: number) => 170 - ((val - 1) / 4) * 140;

  const moodSegments = useMemo(
    () => buildDiscontinuousPath(checkIns, (c) => c.mood, (i) => getX(i, checkIns.length), getY),
    [checkIns, chartWidth]
  );

  const stressSegments = useMemo(
    () => buildDiscontinuousPath(checkIns, (c) => c.stress, (i) => getX(i, checkIns.length), getY),
    [checkIns, chartWidth]
  );

  const energySegments = useMemo(
    () => buildDiscontinuousPath(checkIns, (c) => c.energy, (i) => getX(i, checkIns.length), getY),
    [checkIns, chartWidth]
  );

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

              {/* Accessible Hidden Summary for Assistive Technology */}
              {checkIns.length > 0 && (
                <div className="sr-only" role="region" aria-label="Wellness check-in trend data table">
                  <table>
                    <caption>Recorded Daily Wellness Metrics</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Mood</th>
                        <th scope="col">Stress</th>
                        <th scope="col">Energy</th>
                        <th scope="col">Sleep Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkIns.map((c) => (
                        <tr key={c.id}>
                          <td>{formatFullDate(c.recordedAt)}</td>
                          <td>{c.mood !== null && c.mood !== undefined ? `${c.mood} out of 5` : 'Not recorded'}</td>
                          <td>{c.stress !== null && c.stress !== undefined ? `${c.stress} out of 5` : 'Not recorded'}</td>
                          <td>{c.energy !== null && c.energy !== undefined ? `${c.energy} out of 5` : 'Not recorded'}</td>
                          <td>
                            {c.sleepDurationMinutes !== null && c.sleepDurationMinutes !== undefined
                              ? `${(c.sleepDurationMinutes / 60).toFixed(1)} hrs`
                              : 'Not recorded'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Interactive Trend Charts */}
              {checkIns.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '24px 0' }}>
                  {/* Chart 1: Mood, Stress, Energy Multi-Series Line Chart */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          Mood, Stress & Energy Trajectory
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                          Daily self-reported ratings (1 = Low, 5 = High). Hover, tap, or focus points for details.
                        </p>
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0d9488' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0d9488' }} /> Mood
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#e11d48' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#e11d48' }} /> Stress
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0284c7' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} /> Energy
                        </span>
                      </div>
                    </div>

                    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                      <svg
                        role="img"
                        aria-label="Mood, Stress, and Energy Trend Line Chart"
                        viewBox={`0 0 ${chartWidth} 200`}
                        style={{ width: '100%', height: '200px', display: 'block' }}
                      >
                        {/* Grid Lines Y (1 to 5) */}
                        {[1, 2, 3, 4, 5].map((val) => {
                          const y = getY(val);
                          return (
                            <g key={val}>
                              <line x1="40" y1={y} x2={chartWidth - 20} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                              <text x="25" y={y + 4} fill="#94a3b8" fontSize="11" textAnchor="end">{val}</text>
                            </g>
                          );
                        })}

                        {/* Discontinuous Path Segments: Mood */}
                        {moodSegments.map((d, sIdx) => (
                          <path
                            key={`mood-seg-${sIdx}`}
                            d={d}
                            fill="none"
                            stroke="#0d9488"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}

                        {/* Discontinuous Path Segments: Stress */}
                        {stressSegments.map((d, sIdx) => (
                          <path
                            key={`stress-seg-${sIdx}`}
                            d={d}
                            fill="none"
                            stroke="#e11d48"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}

                        {/* Discontinuous Path Segments: Energy */}
                        {energySegments.map((d, sIdx) => (
                          <path
                            key={`energy-seg-${sIdx}`}
                            d={d}
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}

                        {/* Interactive Data Points with Touch and Keyboard Accessibility */}
                        {checkIns.map((c, i) => {
                          const x = getX(i, checkIns.length);
                          const dateLabel = formatShortDate(c.recordedAt);
                          const fullDateLabel = formatFullDate(c.recordedAt);

                          const hasMood = c.mood !== null && c.mood !== undefined && !isNaN(c.mood) && c.mood >= 1 && c.mood <= 5;
                          const hasStress = c.stress !== null && c.stress !== undefined && !isNaN(c.stress) && c.stress >= 1 && c.stress <= 5;
                          const hasEnergy = c.energy !== null && c.energy !== undefined && !isNaN(c.energy) && c.energy >= 1 && c.energy <= 5;

                          const moodY = hasMood ? getY(c.mood) : 0;
                          const stressY = hasStress ? getY(c.stress) : 0;
                          const energyY = hasEnergy ? getY(c.energy) : 0;

                          return (
                            <g key={c.id}>
                              {/* Mood Point */}
                              {hasMood && (
                                <g
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${fullDateLabel}: Mood ${c.mood} out of 5`}
                                  style={{ cursor: 'pointer', outline: 'none' }}
                                  onFocus={() => setActiveTooltip({ chart: 'trajectory', x, y: moodY, title: dateLabel, text: `Mood: ${c.mood}/5` })}
                                  onBlur={() => setActiveTooltip(null)}
                                  onMouseEnter={() => setActiveTooltip({ chart: 'trajectory', x, y: moodY, title: dateLabel, text: `Mood: ${c.mood}/5` })}
                                  onMouseLeave={() => setActiveTooltip(null)}
                                  onTouchStart={() => setActiveTooltip({ chart: 'trajectory', x, y: moodY, title: dateLabel, text: `Mood: ${c.mood}/5` })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveTooltip({ chart: 'trajectory', x, y: moodY, title: dateLabel, text: `Mood: ${c.mood}/5` });
                                    }
                                  }}
                                >
                                  <circle
                                    cx={x}
                                    cy={moodY}
                                    r="5"
                                    fill="#0d9488"
                                    stroke="#fff"
                                    strokeWidth="2"
                                  />
                                </g>
                              )}

                              {/* Stress Point */}
                              {hasStress && (
                                <g
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${fullDateLabel}: Stress ${c.stress} out of 5`}
                                  style={{ cursor: 'pointer', outline: 'none' }}
                                  onFocus={() => setActiveTooltip({ chart: 'trajectory', x, y: stressY, title: dateLabel, text: `Stress: ${c.stress}/5` })}
                                  onBlur={() => setActiveTooltip(null)}
                                  onMouseEnter={() => setActiveTooltip({ chart: 'trajectory', x, y: stressY, title: dateLabel, text: `Stress: ${c.stress}/5` })}
                                  onMouseLeave={() => setActiveTooltip(null)}
                                  onTouchStart={() => setActiveTooltip({ chart: 'trajectory', x, y: stressY, title: dateLabel, text: `Stress: ${c.stress}/5` })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveTooltip({ chart: 'trajectory', x, y: stressY, title: dateLabel, text: `Stress: ${c.stress}/5` });
                                    }
                                  }}
                                >
                                  <rect
                                    x={x - 4}
                                    y={stressY - 4}
                                    width="8"
                                    height="8"
                                    fill="#e11d48"
                                    stroke="#fff"
                                    strokeWidth="1.5"
                                  />
                                </g>
                              )}

                              {/* Energy Point */}
                              {hasEnergy && (
                                <g
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${fullDateLabel}: Energy ${c.energy} out of 5`}
                                  style={{ cursor: 'pointer', outline: 'none' }}
                                  onFocus={() => setActiveTooltip({ chart: 'trajectory', x, y: energyY, title: dateLabel, text: `Energy: ${c.energy}/5` })}
                                  onBlur={() => setActiveTooltip(null)}
                                  onMouseEnter={() => setActiveTooltip({ chart: 'trajectory', x, y: energyY, title: dateLabel, text: `Energy: ${c.energy}/5` })}
                                  onMouseLeave={() => setActiveTooltip(null)}
                                  onTouchStart={() => setActiveTooltip({ chart: 'trajectory', x, y: energyY, title: dateLabel, text: `Energy: ${c.energy}/5` })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveTooltip({ chart: 'trajectory', x, y: energyY, title: dateLabel, text: `Energy: ${c.energy}/5` });
                                    }
                                  }}
                                >
                                  <circle
                                    cx={x}
                                    cy={energyY}
                                    r="4"
                                    fill="#0284c7"
                                    stroke="#fff"
                                    strokeWidth="1.5"
                                  />
                                </g>
                              )}

                              {/* X Axis Date Label */}
                              <text x={x} y="192" fill="#64748b" fontSize="10" textAnchor="middle">{dateLabel}</text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Popup for Trajectory Chart */}
                      {activeTooltip && activeTooltip.chart === 'trajectory' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${activeTooltip.x}px`,
                            top: `${activeTooltip.y - 45}px`,
                            transform: 'translateX(-50%)',
                            background: '#0f172a',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          <div>{activeTooltip.title}</div>
                          <div>{activeTooltip.text}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart 2: Sleep Duration Bar Chart (No unverified medical target line) */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                          Sleep Duration History
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                          Recorded total sleep duration hours per night.
                        </p>
                      </div>

                      {/* Legend without unverified target line */}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#6366f1' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#6366f1' }} /> Sleep (Hours)
                        </span>
                      </div>
                    </div>

                    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                      <svg
                        role="img"
                        aria-label="Recorded Sleep Duration History Bar Chart"
                        viewBox={`0 0 ${chartWidth} 170`}
                        style={{ width: '100%', height: '170px', display: 'block' }}
                      >
                        {/* Y-axis guidelines (0, 4, 8, 12 hours) */}
                        {[0, 4, 8, 12].map((hrs) => {
                          const y = 140 - (hrs / 12) * 120;
                          return (
                            <g key={hrs}>
                              <line x1="40" y1={y} x2={chartWidth - 20} y2={y} stroke="#e2e8f0" />
                              <text x="32" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{hrs}h</text>
                            </g>
                          );
                        })}

                        {/* Bars with Missing Data Discrimination & Keyboard/Touch Accessibility */}
                        {checkIns.map((c, i) => {
                          const step = (chartWidth - 80) / Math.max(1, checkIns.length);
                          const x = 50 + i * step;
                          const dateLabel = formatShortDate(c.recordedAt);
                          const fullDateLabel = formatFullDate(c.recordedAt);

                          const hasRecordedDuration =
                            c.sleepDurationMinutes !== null &&
                            c.sleepDurationMinutes !== undefined &&
                            !isNaN(c.sleepDurationMinutes);

                          const hours = hasRecordedDuration ? c.sleepDurationMinutes! / 60 : null;
                          const barHeight = hours !== null ? Math.min(120, (hours / 12) * 120) : 0;
                          const y = 140 - barHeight;

                          const tooltipX = x + Math.min(14, step * 0.325);
                          const tooltipY = hours !== null ? Math.max(20, y) : 135;

                          const tooltipText =
                            hours !== null
                              ? `Sleep: ${hours.toFixed(1)} hrs (${c.sleepDurationMinutes}m)`
                              : 'Sleep: Not logged';

                          const ariaLabel =
                            hours !== null
                              ? `${fullDateLabel}: Sleep duration ${hours.toFixed(1)} hours`
                              : `${fullDateLabel}: Sleep duration not logged`;

                          return (
                            <g
                              key={c.id}
                              tabIndex={0}
                              role="button"
                              aria-label={ariaLabel}
                              style={{ cursor: 'pointer', outline: 'none' }}
                              onFocus={() => setActiveTooltip({ chart: 'sleep', x: tooltipX, y: tooltipY, title: dateLabel, text: tooltipText })}
                              onBlur={() => setActiveTooltip(null)}
                              onMouseEnter={() => setActiveTooltip({ chart: 'sleep', x: tooltipX, y: tooltipY, title: dateLabel, text: tooltipText })}
                              onMouseLeave={() => setActiveTooltip(null)}
                              onTouchStart={() => setActiveTooltip({ chart: 'sleep', x: tooltipX, y: tooltipY, title: dateLabel, text: tooltipText })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setActiveTooltip({ chart: 'sleep', x: tooltipX, y: tooltipY, title: dateLabel, text: tooltipText });
                                }
                              }}
                            >
                              {hours !== null && hours > 0 ? (
                                <rect
                                  x={x}
                                  y={y}
                                  width={Math.min(28, step * 0.65)}
                                  height={barHeight}
                                  fill="#6366f1"
                                  rx="4"
                                  ry="4"
                                />
                              ) : hours === 0 ? (
                                <line
                                  x1={x}
                                  y1="140"
                                  x2={x + Math.min(28, step * 0.65)}
                                  y2="140"
                                  stroke="#6366f1"
                                  strokeWidth="2"
                                />
                              ) : (
                                <text x={x + Math.min(14, step * 0.325)} y="135" fill="#94a3b8" fontSize="10" textAnchor="middle">
                                  —
                                </text>
                              )}
                              <text x={x + Math.min(14, step * 0.325)} y="158" fill="#64748b" fontSize="10" textAnchor="middle">
                                {dateLabel}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Popup for Sleep Chart */}
                      {activeTooltip && activeTooltip.chart === 'sleep' && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${activeTooltip.x}px`,
                            top: `${activeTooltip.y - 45}px`,
                            transform: 'translateX(-50%)',
                            background: '#0f172a',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          <div>{activeTooltip.title}</div>
                          <div>{activeTooltip.text}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
