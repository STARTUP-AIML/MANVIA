import { useState } from 'react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { WellnessSummaryCards } from '@/features/wellness/components/WellnessSummaryCards';
import { WellnessTrendsSection } from '@/features/wellness/components/WellnessTrendsSection';
import { WellnessHistoryTable } from '@/features/wellness/components/WellnessHistoryTable';
import { WellnessCheckInModal } from '@/features/wellness/components/WellnessCheckInModal';
import { useWellnessSummary } from '@/hooks/useWellness';
import { getUserTimezone } from '@/lib/date';

export function WellnessPage() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const timezone = getUserTimezone();
  const { data: summary } = useWellnessSummary(timezone);

  return (
    <PatientLayout activeTab="wellness">
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div className="eyebrow">PHASE 5 ENGINE</div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '6px 0 4px', color: '#073a78' }}>
            Wellness & Daily Check-ins
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Track daily subjective mood, stress, energy, and sleep metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCheckInOpen(true)}
          className="primary"
          style={{ padding: '12px 24px', fontSize: '13px' }}
        >
          + Daily Check-in <span>→</span>
        </button>
      </div>

      {/* Summary Cards */}
      <WellnessSummaryCards
        summary={summary}
        onOpenCheckIn={() => setIsCheckInOpen(true)}
      />

      {/* Trends & Insights */}
      <WellnessTrendsSection />

      {/* Check-ins History Table */}
      <WellnessHistoryTable onOpenCheckIn={() => setIsCheckInOpen(true)} />

      {/* Medical Safety & Regulatory Disclaimer */}
      <div
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        <strong>Safety & Non-Diagnostic Notice:</strong> The MANVIA Wellness Engine records subjective, patient-reported metrics. Trend calculations and observational insights are descriptive and mathematical. They do not constitute clinical evaluations, diagnostic scores, or medical advice. For any clinical concerns, please consult a verified physician or use emergency services.
      </div>

      {/* Check-in Modal */}
      <WellnessCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />
    </PatientLayout>
  );
}
