import { apiFetch } from './client';
import type { InvoiceQueryParams, InvoiceResponseDto } from '@/types';

/**
 * Lists finalized invoices scoped to the authenticated user.
 * GET /api/v1/invoices
 */
export async function getInvoicesApi(
  params?: InvoiceQueryParams,
): Promise<{ items: InvoiceResponseDto[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.patientId) search.set('patientId', params.patientId);
  if (params?.doctorId) search.set('doctorId', params.doctorId);
  if (params?.status) search.set('status', params.status);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));

  const query = search.toString();
  return apiFetch<{ items: InvoiceResponseDto[]; total: number }>(
    query ? `/invoices?${query}` : '/invoices',
  );
}

/**
 * Retrieves a single invoice by UUID, public ID, or invoice number.
 * GET /api/v1/invoices/:id
 */
export async function getInvoiceByIdApi(id: string): Promise<InvoiceResponseDto> {
  return apiFetch<InvoiceResponseDto>(`/invoices/${id}`);
}
