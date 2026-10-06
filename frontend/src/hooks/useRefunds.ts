import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { getRefundsApi, getRefundByIdApi } from '@/api';
import type { RefundQueryParams } from '@/types';

export const REFUND_KEYS = {
  all: ['refunds'] as const,
  list: (params?: RefundQueryParams) => ['refunds', 'list', params] as const,
  detail: (id: string) => ['refunds', 'detail', id] as const,
};

export function useRefunds(params?: RefundQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: REFUND_KEYS.list(params),
    queryFn: () => getRefundsApi(params),
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });
}

export function useRefund(id: string, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: REFUND_KEYS.detail(id),
    queryFn: () => getRefundByIdApi(id),
    ...options,
    enabled: isAuthReady && Boolean(id) && (options?.enabled ?? true),
  });
}
