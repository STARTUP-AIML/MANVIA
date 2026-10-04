import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPaymentApi,
  getPaymentsApi,
  getPaymentByIdApi,
  getPaymentAttemptsApi,
  verifyPaymentApi,
} from '@/api';
import type { CreatePaymentDto, PaymentQueryParams, VerifyPaymentDto } from '@/types';

export const PAYMENT_KEYS = {
  all: ['payments'] as const,
  list: (params?: PaymentQueryParams) => ['payments', 'list', params] as const,
  detail: (id: string) => ['payments', 'detail', id] as const,
  attempts: (id: string) => ['payments', 'attempts', id] as const,
};

export function usePayments(params?: PaymentQueryParams) {
  return useQuery({
    queryKey: PAYMENT_KEYS.list(params),
    queryFn: () => getPaymentsApi(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: PAYMENT_KEYS.detail(id),
    queryFn: () => getPaymentByIdApi(id),
    enabled: !!id,
  });
}

export function usePaymentAttempts(id: string) {
  return useQuery({
    queryKey: PAYMENT_KEYS.attempts(id),
    queryFn: () => getPaymentAttemptsApi(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePaymentDto) => createPaymentApi(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.setQueryData(PAYMENT_KEYS.detail(data.id), data);
      if (data.publicPaymentId) {
        queryClient.setQueryData(PAYMENT_KEYS.detail(data.publicPaymentId), data);
      }
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: VerifyPaymentDto }) => verifyPaymentApi(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.setQueryData(PAYMENT_KEYS.detail(data.id), data);
    },
  });
}
