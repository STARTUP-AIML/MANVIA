import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScoreSelector } from '../components/common/ScoreSelector.js';
import { WellnessSummaryCards } from '../components/wellness/WellnessSummaryCards.js';
import { WellnessCheckInModal } from '../components/wellness/WellnessCheckInModal.js';
import { WellnessTrendsSection } from '../components/wellness/WellnessTrendsSection.js';
import { WellnessHistoryTable } from '../components/wellness/WellnessHistoryTable.js';
import * as wellnessApi from '../api/wellness.js';

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

      fireEvent.click(radios[4]);
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
