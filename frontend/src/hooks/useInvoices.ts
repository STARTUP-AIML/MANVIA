import { useQuery } from '@tanstack/react-query';
import { getInvoicesApi, getInvoiceByIdApi } from '@/api';
import type { InvoiceQueryParams } from '@/types';

export const INVOICE_KEYS = {
  all: ['invoices'] as const,
  list: (params?: InvoiceQueryParams) => ['invoices', 'list', params] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
};

export function useInvoices(params?: InvoiceQueryParams) {
  return useQuery({
    queryKey: INVOICE_KEYS.list(params),
    queryFn: () => getInvoicesApi(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: () => getInvoiceByIdApi(id),
    enabled: !!id,
  });
}
