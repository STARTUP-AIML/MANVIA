import { apiFetch } from './client';
import type { DoctorPayoutResponseDto, PayoutQueryParams } from '@/types';

/**
 * Lists doctor payouts (authorized doctor sees only their own payouts).
 * GET /api/v1/payouts
 */
export async function getPayoutsApi(
  params?: PayoutQueryParams,
): Promise<{ items: DoctorPayoutResponseDto[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.doctorId) search.set('doctorId', params.doctorId);
  if (params?.status) search.set('status', params.status);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));

  const query = search.toString();
  return apiFetch<{ items: DoctorPayoutResponseDto[]; total: number }>(
    query ? `/payouts?${query}` : '/payouts',
  );
}

/**
 * Retrieves a single payout record.
 * GET /api/v1/payouts/:id
 */
export async function getPayoutByIdApi(id: string): Promise<DoctorPayoutResponseDto> {
  return apiFetch<DoctorPayoutResponseDto>(`/payouts/${id}`);
}
