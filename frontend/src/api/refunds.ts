import { apiFetch } from './client';
import type { PaginatedRefundsResponseDto, RefundQueryParams, RefundResponseDto } from '@/types';

/**
 * Lists refunds scoped to the authenticated patient or platform admin.
 * GET /api/v1/refunds
 */
export async function getRefundsApi(
  params?: RefundQueryParams,
): Promise<PaginatedRefundsResponseDto> {
  const search = new URLSearchParams();
  if (params?.appointmentId) search.set('appointmentId', params.appointmentId);
  if (params?.status) search.set('status', params.status);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));

  const query = search.toString();
  return apiFetch<PaginatedRefundsResponseDto>(query ? `/refunds?${query}` : '/refunds');
}

/**
 * Retrieves a single refund by ID or public refund ID.
 * GET /api/v1/refunds/:id
 */
export async function getRefundByIdApi(id: string): Promise<RefundResponseDto> {
  return apiFetch<RefundResponseDto>(`/refunds/${id}`);
}
