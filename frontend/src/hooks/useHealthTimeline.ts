/**
 * TanStack Query Hook for MANVIA Health Timeline
 * Strictly manages server state, stable query keys, and pagination.
 */

import { useQuery } from '@tanstack/react-query';
import { getHealthTimelineApi } from '@/api/';
import type { PaginatedTimelineResponse, TimelineQueryParams } from '@/types/';

export const timelineQueryKeys = {
  all: ['health-timeline'] as const,
  list: (params?: TimelineQueryParams) => ['health-timeline', params] as const,
};

export function useHealthTimeline(params?: TimelineQueryParams) {
  return useQuery<PaginatedTimelineResponse, Error>({
    queryKey: timelineQueryKeys.list(params),
    queryFn: () => getHealthTimelineApi(params),
    staleTime: 30 * 1000,
  });
}
