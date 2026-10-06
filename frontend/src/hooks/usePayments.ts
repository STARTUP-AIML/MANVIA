import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
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

export function usePayments(params?: PaymentQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: PAYMENT_KEYS.list(params),
    queryFn: () => getPaymentsApi(params),
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });
}

export function usePayment(id: string, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: PAYMENT_KEYS.detail(id),
    queryFn: () => getPaymentByIdApi(id),
    ...options,
    enabled: isAuthReady && Boolean(id) && (options?.enabled ?? true),
  });
}

export function usePaymentAttempts(id: string, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: PAYMENT_KEYS.attempts(id),
    queryFn: () => getPaymentAttemptsApi(id),
    ...options,
    enabled: isAuthReady && Boolean(id) && (options?.enabled ?? true),
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
