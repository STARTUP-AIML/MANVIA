/**
 * Authoritative Wellness API Endpoints
 * Conforms strictly to backend routes and schemas:
 * GET /api/v1/wellness/summary
 * GET /api/v1/wellness/trends
 * GET /api/v1/wellness/check-ins
 * GET /api/v1/wellness/check-ins/:id
 * POST /api/v1/wellness/check-ins
 * PATCH /api/v1/wellness/check-ins/:id
 * DELETE /api/v1/wellness/check-ins/:id
 */

import { apiFetch } from './client';
import type {
  CreateWellnessCheckInRequest,
  PaginatedWellnessCheckInsResponse,
  UpdateWellnessCheckInRequest,
  WellnessCheckInResponse,
  WellnessQueryParams,
  WellnessSummaryResponse,
  WellnessTrendsQueryParams,
  WellnessTrendsResponse,
} from '@/types/';

export async function getWellnessSummaryApi(timezone?: string): Promise<WellnessSummaryResponse> {
  const query = timezone ? `?timezone=${encodeURIComponent(timezone)}` : '';
  return apiFetch<WellnessSummaryResponse>(`/wellness/summary${query}`);
}

export async function getWellnessTrendsApi(
  params?: WellnessTrendsQueryParams,
): Promise<WellnessTrendsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.period) searchParams.set('period', params.period);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.timezone) searchParams.set('timezone', params.timezone);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<WellnessTrendsResponse>(`/wellness/trends${query}`);
}

export async function getWellnessCheckInsApi(
  params?: WellnessQueryParams,
): Promise<PaginatedWellnessCheckInsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.period) searchParams.set('period', params.period);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.timezone) searchParams.set('timezone', params.timezone);

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch<PaginatedWellnessCheckInsResponse>(`/wellness/check-ins${query}`);
}

export async function getWellnessCheckInByIdApi(id: string): Promise<WellnessCheckInResponse> {
  return apiFetch<WellnessCheckInResponse>(`/wellness/check-ins/${id}`);
}

export async function createWellnessCheckInApi(
  data: CreateWellnessCheckInRequest,
): Promise<WellnessCheckInResponse> {
  return apiFetch<WellnessCheckInResponse>('/wellness/check-ins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWellnessCheckInApi(
  id: string,
  data: UpdateWellnessCheckInRequest,
): Promise<WellnessCheckInResponse> {
  return apiFetch<WellnessCheckInResponse>(`/wellness/check-ins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWellnessCheckInApi(id: string): Promise<void> {
  return apiFetch<void>(`/wellness/check-ins/${id}`, {
    method: 'DELETE',
  });
}
