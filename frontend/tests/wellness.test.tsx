import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScoreSelector } from '@/components/ui/ScoreSelector';
import { WellnessSummaryCards } from '@/features/wellness/components/WellnessSummaryCards';
import { WellnessCheckInModal } from '@/features/wellness/components/WellnessCheckInModal';
import { WellnessTrendsSection } from '@/features/wellness/components/WellnessTrendsSection';
import { WellnessHistoryTable } from '@/features/wellness/components/WellnessHistoryTable';
import * as wellnessApi from '@/api/wellness';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Wellness Module — Phase 5', () => {
  describe('ScoreSelector Component', () => {
    it('renders 1-5 scale with non-clinical labels and accessible radio roles', () => {
      const handleChange = vi.fn();
      render(
        <ScoreSelector
          name="mood"
          label="Mood"
          type="mood"
          value={3}
          onChange={handleChange}
        />
      );

      expect(screen.getByText(/Mood/)).toBeInTheDocument();
      expect(screen.getByText('(3/5)')).toBeInTheDocument();

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
      expect(radios[2]).toHaveAttribute('aria-checked', 'true');
      expect(radios[0]).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(radios[4]!);
      expect(handleChange).toHaveBeenCalledWith(5);
    });
  });

  describe('WellnessSummaryCards Component', () => {
    it('renders streak, total check-ins, and today status correctly', () => {
      const mockSummary = {
        streakDays: 5,
        totalCheckIns: 12,
        todayCheckIn: {
          id: 'w-1',
          patientId: 'p-1',
          mood: 4,
          stress: 2,
          energy: 4,
          sleepQuality: 4,
          sleepDurationMinutes: 450,
          note: 'Feeling good',
          recordedAt: '2026-10-02T08:00:00.000Z',
          createdAt: '2026-10-02T08:00:00.000Z',
          updatedAt: '2026-10-02T08:00:00.000Z',
        },
        latestCheckIn: {
          id: 'w-1',
          patientId: 'p-1',
          mood: 4,
          stress: 2,
          energy: 4,
          sleepQuality: 4,
          sleepDurationMinutes: 450,
          note: 'Feeling good',
          recordedAt: '2026-10-02T08:00:00.000Z',
          createdAt: '2026-10-02T08:00:00.000Z',
          updatedAt: '2026-10-02T08:00:00.000Z',
        },
      };

      const handleOpen = vi.fn();
      render(<WellnessSummaryCards summary={mockSummary} onOpenCheckIn={handleOpen} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText(/Mood: 4\/5/)).toBeInTheDocument();
    });

    it('displays prompt to log check-in when today is pending', () => {
      const handleOpen = vi.fn();
      render(
        <WellnessSummaryCards
          summary={{ streakDays: 0, totalCheckIns: 0, todayCheckIn: null, latestCheckIn: null }}
          onOpenCheckIn={handleOpen}
        />
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: "Log Today's Check-in" });
      fireEvent.click(btn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('WellnessCheckInModal Component', () => {
    it('renders all backend-supported fields and validates input', async () => {
      const handleClose = vi.fn();
      render(<WellnessCheckInModal isOpen={true} onClose={handleClose} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('heading', { name: 'Daily Wellness Check-in' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Sleep Duration/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Reflection \/ Personal Note/)).toBeInTheDocument();

      // Test sleep hours validation
      const sleepInput = screen.getByLabelText(/Sleep Duration/) as HTMLInputElement;
      fireEvent.change(sleepInput, { target: { value: '28' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Check-in/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Sleep hours must be between 0 and 24')).toBeInTheDocument();
      });
    });

    it('submits valid data to backend and prevents duplicate submission', async () => {
      const createSpy = vi.spyOn(wellnessApi, 'createWellnessCheckInApi').mockResolvedValue({
        id: 'new-w-1',
        patientId: 'pat-1',
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
        sleepDurationMinutes: 480,
        note: 'Restful night',
        recordedAt: '2026-10-02T10:00:00.000Z',
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
      });

      const handleClose = vi.fn();
      render(<WellnessCheckInModal isOpen={true} onClose={handleClose} />, {
        wrapper: createWrapper(),
      });

      const sleepInput = screen.getByLabelText(/Sleep Duration/);
      fireEvent.change(sleepInput, { target: { value: '8' } });

      const noteInput = screen.getByLabelText(/Reflection \/ Personal Note/);
      fireEvent.change(noteInput, { target: { value: 'Restful night' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Check-in/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            mood: 3,
            stress: 3,
            energy: 3,
            sleepQuality: 3,
            sleepHours: 8,
            sleepDurationMinutes: 480,
            note: 'Restful night',
          })
        );
      });
    });
  });

  describe('WellnessTrendsSection Component', () => {
    it('displays insufficient data message when fewer than 3 check-ins exist', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 2,
        hasSufficientData: false,
        descriptiveInsights: [],
      });

      render(<WellnessTrendsSection />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Insufficient Data Points \(2\/3\)/)).toBeInTheDocument();
        expect(
          screen.getByText(/minimum of 3 check-ins within the selected 7d window/i)
        ).toBeInTheDocument();
      });
    });

    it('renders averages and descriptive insights verbatim when sufficient data exists', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 5,
        hasSufficientData: true,
        averageMood: 4.2,
        averageStress: 2.1,
        averageEnergy: 3.9,
        averageSleepQuality: 4.0,
        averageSleepDurationMinutes: 460,
        previousPeriodComparison: {
          previousTotalCheckIns: 4,
          moodDelta: 0.5,
          stressDelta: -0.3,
          energyDelta: 0.2,
          sleepQualityDelta: 0.4,
          sleepDurationMinutesDelta: 20,
        },
        descriptiveInsights: [
          'Your recorded mood average increased by 0.5 compared with the previous period.',
          'Your recorded stress level was lower on average compared with the previous period.',
        ],
      });

      render(<WellnessTrendsSection />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('4.2 / 5')).toBeInTheDocument();
        expect(screen.getByText('2.1 / 5')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Your recorded mood average increased by 0.5 compared with the previous period.'
          )
        ).toBeInTheDocument();
      });
    });

    it('does not render hardcoded 8-hour target line or unverified target legend in sleep chart', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 3,
        hasSufficientData: true,
        averageMood: 4.0,
        averageStress: 2.0,
        averageEnergy: 4.0,
        averageSleepQuality: 4.0,
        averageSleepDurationMinutes: 480,
        descriptiveInsights: [],
      });

      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [
          {
            id: 'chk-1',
            patientId: 'pat-1',
            mood: 4,
            stress: 2,
            energy: 4,
            sleepQuality: 4,
            sleepDurationMinutes: 480,
            recordedAt: '2026-10-01T10:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      render(<WellnessTrendsSection />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sleep Duration History')).toBeInTheDocument();
      });

      // Target line and legends should not exist
      expect(screen.queryByText(/8h target/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/7–9h Target/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/clinical benchmark/i)).not.toBeInTheDocument();
    });

    it('handles missing mood, stress, energy, and sleep duration without treating missing data as zero', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 3,
        hasSufficientData: true,
        averageMood: 4.0,
        averageStress: 2.0,
        averageEnergy: 4.0,
        averageSleepQuality: 4.0,
        averageSleepDurationMinutes: 450,
        descriptiveInsights: [],
      });

      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [
          {
            id: 'chk-1',
            patientId: 'pat-1',
            mood: 4,
            stress: 2,
            energy: 4,
            sleepQuality: 4,
            sleepDurationMinutes: 480,
            recordedAt: '2026-10-01T10:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
          {
            id: 'chk-2',
            patientId: 'pat-1',
            mood: null as any,
            stress: 3,
            energy: null as any,
            sleepQuality: 3,
            sleepDurationMinutes: null,
            recordedAt: '2026-10-02T10:00:00.000Z',
            createdAt: '2026-10-02T10:00:00.000Z',
            updatedAt: '2026-10-02T10:00:00.000Z',
          },
          {
            id: 'chk-3',
            patientId: 'pat-1',
            mood: 5,
            stress: 1,
            energy: 5,
            sleepQuality: 5,
            sleepDurationMinutes: 420,
            recordedAt: '2026-10-03T10:00:00.000Z',
            createdAt: '2026-10-03T10:00:00.000Z',
            updatedAt: '2026-10-03T10:00:00.000Z',
          },
        ],
        total: 3,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      render(<WellnessTrendsSection />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Sleep Duration History')).toBeInTheDocument();
      });

      // Missing sleep duration is not treated as zero bar, but labeled as not logged
      expect(screen.getByLabelText(/Sleep duration not logged/i)).toBeInTheDocument();

      // Valid observations have explicit labels
      expect(screen.getByLabelText(/Mood 4 out of 5/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mood 5 out of 5/i)).toBeInTheDocument();

      // Check-in 2 has missing mood, so no Mood point is rendered for it
      expect(screen.queryByLabelText(/Oct 2.*Mood/i)).not.toBeInTheDocument();
    });

    it('supports keyboard and touch accessibility for interactive chart points', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 3,
        hasSufficientData: true,
        averageMood: 4.0,
        averageStress: 2.0,
        averageEnergy: 4.0,
        averageSleepQuality: 4.0,
        averageSleepDurationMinutes: 480,
        descriptiveInsights: [],
      });

      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [
          {
            id: 'chk-1',
            patientId: 'pat-1',
            mood: 4,
            stress: 2,
            energy: 4,
            sleepQuality: 4,
            sleepDurationMinutes: 480,
            recordedAt: '2026-10-01T10:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      render(<WellnessTrendsSection />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/Mood 4 out of 5/i)).toBeInTheDocument();
      });

      const moodPoint = screen.getByLabelText(/Mood 4 out of 5/i);
      expect(moodPoint).toHaveAttribute('tabindex', '0');
      expect(moodPoint).toHaveAttribute('role', 'button');

      // Focus triggers tooltip
      fireEvent.focus(moodPoint);
      expect(screen.getByText('Mood: 4/5')).toBeInTheDocument();

      // Blur dismisses tooltip
      fireEvent.blur(moodPoint);
      expect(screen.queryByText('Mood: 4/5')).not.toBeInTheDocument();

      // Touch triggers tooltip
      fireEvent.touchStart(moodPoint);
      expect(screen.getByText('Mood: 4/5')).toBeInTheDocument();
    });

    it('formats dates using application localization context', async () => {
      vi.spyOn(wellnessApi, 'getWellnessTrendsApi').mockResolvedValue({
        period: '7d',
        startDate: '2026-09-25T00:00:00.000Z',
        endDate: '2026-10-02T00:00:00.000Z',
        totalCheckIns: 3,
        hasSufficientData: true,
        averageMood: 4.0,
        averageStress: 2.0,
        averageEnergy: 4.0,
        averageSleepQuality: 4.0,
        averageSleepDurationMinutes: 480,
        descriptiveInsights: [],
      });

      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [
          {
            id: 'chk-1',
            patientId: 'pat-1',
            mood: 4,
            stress: 2,
            energy: 4,
            sleepQuality: 4,
            sleepDurationMinutes: 480,
            recordedAt: '2026-10-01T10:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      const { I18nProvider } = await import('@/i18n/i18nContext');
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <I18nProvider initialLanguage="te">
            <WellnessTrendsSection />
          </I18nProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /Mood, Stress, and Energy Trend Line Chart/i })).toBeInTheDocument();
      });

      const teluguExpectedDate = new Intl.DateTimeFormat('te-IN', {
        month: 'short',
        day: 'numeric',
      }).format(new Date('2026-10-01T10:00:00.000Z'));

      expect(screen.getAllByText(teluguExpectedDate).length).toBeGreaterThan(0);
    });
  });

  describe('WellnessHistoryTable Component', () => {
    it('renders empty state when no check-ins exist', async () => {
      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const handleOpen = vi.fn();
      render(<WellnessHistoryTable onOpenCheckIn={handleOpen} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('No wellness check-ins yet')).toBeInTheDocument();
      });
    });

    it('renders check-in rows and pagination controls', async () => {
      vi.spyOn(wellnessApi, 'getWellnessCheckInsApi').mockResolvedValue({
        data: [
          {
            id: 'chk-1',
            patientId: 'pat-1',
            mood: 4,
            stress: 2,
            energy: 4,
            sleepQuality: 5,
            sleepDurationMinutes: 480,
            note: 'Feeling well rested',
            recordedAt: '2026-10-01T12:00:00.000Z',
            createdAt: '2026-10-01T12:00:00.000Z',
            updatedAt: '2026-10-01T12:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      render(<WellnessHistoryTable onOpenCheckIn={vi.fn()} />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(screen.getByText('Feeling well rested')).toBeInTheDocument();
        expect(screen.getByText(/Showing page 1 of 1/)).toBeInTheDocument();
      });
    });
  });
});
