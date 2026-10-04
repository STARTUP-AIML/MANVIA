import { apiFetch } from './client';
import type {
  CreatePaymentDto,
  PaymentQueryParams,
  PaymentResponseDto,
  PaymentAttemptResponseDto,
  VerifyPaymentDto,
} from '@/types';

/**
 * Initiates a payment session for an eligible appointment.
 * POST /api/v1/payments
 */
export async function createPaymentApi(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
  const headers: Record<string, string> = {};
  if (dto.idempotencyKey) {
    headers['idempotency-key'] = dto.idempotencyKey;
  }
  return apiFetch<PaymentResponseDto>('/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });
}

/**
 * Lists payments scoped to the authenticated user.
 * GET /api/v1/payments
 */
export async function getPaymentsApi(
  params?: PaymentQueryParams,
): Promise<{ items: PaymentResponseDto[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.appointmentId) search.set('appointmentId', params.appointmentId);
  if (params?.patientId) search.set('patientId', params.patientId);
  if (params?.doctorId) search.set('doctorId', params.doctorId);
  if (params?.status) search.set('status', params.status);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));

  const query = search.toString();
  return apiFetch<{ items: PaymentResponseDto[]; total: number }>(
    query ? `/payments?${query}` : '/payments',
  );
}

/**
 * Gets payment details by UUID or public ID.
 * GET /api/v1/payments/:id
 */
export async function getPaymentByIdApi(id: string): Promise<PaymentResponseDto> {
  return apiFetch<PaymentResponseDto>(`/payments/${id}`);
}

/**
 * Gets payment attempts history for a payment.
 * GET /api/v1/payments/:id/attempts
 */
export async function getPaymentAttemptsApi(id: string): Promise<PaymentAttemptResponseDto[]> {
  return apiFetch<PaymentAttemptResponseDto[]>(`/payments/${id}/attempts`);
}

/**
 * Verifies payment via trusted server-side check.
 * POST /api/v1/payments/:id/verify
 */
export async function verifyPaymentApi(
  id: string,
  dto: VerifyPaymentDto,
): Promise<PaymentResponseDto> {
  return apiFetch<PaymentResponseDto>(`/payments/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
