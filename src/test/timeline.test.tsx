import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimelineFilterBar } from '../components/timeline/TimelineFilterBar.js';
import { TimelineEventCard } from '../components/timeline/TimelineEventCard.js';
import { TimelineFeed } from '../components/timeline/TimelineFeed.js';
import * as timelineApi from '../api/timeline.js';
import type { TimelineEventResponse } from '../types/timeline.js';

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

describe('Health Timeline Module — Phase 5', () => {
  describe('TimelineFilterBar Component', () => {
    it('renders all backend-authorized event filters', () => {
      const handleSelect = vi.fn();
      render(<TimelineFilterBar selected="ALL" onSelect={handleSelect} />);

      expect(screen.getByRole('tab', { name: /All Activity/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Wellness Check-ins/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Health Records/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Appointments/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Consultations/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: /Wellness Check-ins/ }));
      expect(handleSelect).toHaveBeenCalledWith('WELLNESS_CHECK_IN');
    });
  });

  describe('TimelineEventCard Component', () => {
    it('renders event details, public event id, and summary', () => {
      const mockEvent: TimelineEventResponse = {
        id: 'evt-1',
        publicEventId: 'EVT-9812A45C',
        patientId: 'pat-1',
        eventType: 'WELLNESS_CHECK_IN',
        title: 'Daily Wellness Check-in',
        summary: 'Mood: 4/5, Sleep: 8h, Stress: 2/5',
        sourceType: 'WELLNESS_CHECK_IN',
        sourceId: 'chk-123',
        eventTimestamp: '2026-10-02T08:30:00.000Z',
        createdAt: '2026-10-02T08:30:00.000Z',
      };

      render(<TimelineEventCard event={mockEvent} />);

      expect(screen.getByText('Daily Wellness Check-in')).toBeInTheDocument();
      expect(screen.getByText('Mood: 4/5, Sleep: 8h, Stress: 2/5')).toBeInTheDocument();
      expect(screen.getByText('EVT-9812A45C')).toBeInTheDocument();
      expect(screen.getByText(/WELLNESS_CHECK_IN/)).toBeInTheDocument();
    });
  });

  describe('TimelineFeed Component', () => {
    it('renders empty state when timeline has no events', async () => {
      vi.spyOn(timelineApi, 'getHealthTimelineApi').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 0,
      });

      render(<TimelineFeed />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No timeline events found')).toBeInTheDocument();
      });
    });

    it('renders events and pagination controls', async () => {
      vi.spyOn(timelineApi, 'getHealthTimelineApi').mockResolvedValue({
        data: [
          {
            id: 'evt-101',
            publicEventId: 'EVT-00101A',
            patientId: 'pat-1',
            eventType: 'HEALTH_RECORD_ADDED',
            title: 'Fasting Lipid & HbA1c Panel Added',
            summary: 'Uploaded Lab Report (PDF, 1.4 MB)',
            sourceType: 'HEALTH_RECORD',
            eventTimestamp: '2026-10-01T10:00:00.000Z',
            createdAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        total: 25,
        page: 1,
        limit: 15,
        totalPages: 2,
      });

      render(<TimelineFeed />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Fasting Lipid & HbA1c Panel Added')).toBeInTheDocument();
        expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();
        expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
      });
    });

    it('renders error state on API failure', async () => {
      vi.spyOn(timelineApi, 'getHealthTimelineApi').mockRejectedValue(
        new Error('Network error loading timeline')
      );

      render(<TimelineFeed />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Could not load health timeline')).toBeInTheDocument();
        expect(screen.getByText('Network error loading timeline')).toBeInTheDocument();
      });
    });
  });
});
