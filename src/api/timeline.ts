/**
 * Authoritative Health Timeline API Endpoints
 * Conforms strictly to backend routes and schemas:
 * GET /api/v1/health-timeline
 */

import { apiFetch } from './client.js';
import type { PaginatedTimelineResponse, TimelineQueryParams } from '../types/timeline.js';

export async function getHealthTimelineApi(
  params?: TimelineQueryParams,
): Promise<PaginatedTimelineResponse> {
  const searchParams = new URLSearchParams();
  if (params?.eventType) searchParams.set('eventType', params.eventType);
  if (params?.eventTypes) searchParams.set('eventTypes', params.eventTypes);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<PaginatedTimelineResponse>(`/health-timeline${query}`);
}
