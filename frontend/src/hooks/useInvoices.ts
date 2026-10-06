import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { getInvoicesApi, getInvoiceByIdApi } from '@/api';
import type { InvoiceQueryParams } from '@/types';

export const INVOICE_KEYS = {
  all: ['invoices'] as const,
  list: (params?: InvoiceQueryParams) => ['invoices', 'list', params] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
};

export function useInvoices(params?: InvoiceQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: INVOICE_KEYS.list(params),
    queryFn: () => getInvoicesApi(params),
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });
}

export function useInvoice(id: string, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: () => getInvoiceByIdApi(id),
    ...options,
    enabled: isAuthReady && Boolean(id) && (options?.enabled ?? true),
  });
}
