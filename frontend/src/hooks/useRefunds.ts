import { useQuery } from '@tanstack/react-query';
import { getRefundsApi, getRefundByIdApi } from '@/api';
import type { RefundQueryParams } from '@/types';

export const REFUND_KEYS = {
  all: ['refunds'] as const,
  list: (params?: RefundQueryParams) => ['refunds', 'list', params] as const,
  detail: (id: string) => ['refunds', 'detail', id] as const,
};

export function useRefunds(params?: RefundQueryParams) {
  return useQuery({
    queryKey: REFUND_KEYS.list(params),
    queryFn: () => getRefundsApi(params),
  });
}

export function useRefund(id: string) {
  return useQuery({
    queryKey: REFUND_KEYS.detail(id),
    queryFn: () => getRefundByIdApi(id),
    enabled: !!id,
  });
}
