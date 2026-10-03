/**
 * TanStack Query Hooks for MANVIA Wellness Module
 * Strictly manages server state, stable query keys, and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWellnessSummaryApi,
  getWellnessTrendsApi,
  getWellnessCheckInsApi,
  getWellnessCheckInByIdApi,
  createWellnessCheckInApi,
  updateWellnessCheckInApi,
  deleteWellnessCheckInApi,
} from '@/api/';
import type {
  CreateWellnessCheckInRequest,
  PaginatedWellnessCheckInsResponse,
  UpdateWellnessCheckInRequest,
  WellnessCheckInResponse,
  WellnessQueryParams,
  WellnessSummaryResponse,
  WellnessTrendsQueryParams,
  WellnessTrendsResponse,
} from '@/types/';

export const wellnessQueryKeys = {
  all: ['wellness'] as const,
  summary: (timezone?: string) => ['wellness', 'summary', { timezone }] as const,
  trends: (params?: WellnessTrendsQueryParams) => ['wellness', 'trends', params] as const,
  checkIns: (params?: WellnessQueryParams) => ['wellness', 'check-ins', params] as const,
  detail: (id: string) => ['wellness', 'check-in', id] as const,
};

export function useWellnessSummary(timezone?: string) {
  return useQuery<WellnessSummaryResponse, Error>({
    queryKey: wellnessQueryKeys.summary(timezone),
    queryFn: () => getWellnessSummaryApi(timezone),
    staleTime: 60 * 1000,
  });
}

export function useWellnessTrends(params?: WellnessTrendsQueryParams) {
  return useQuery<WellnessTrendsResponse, Error>({
    queryKey: wellnessQueryKeys.trends(params),
    queryFn: () => getWellnessTrendsApi(params),
    staleTime: 60 * 1000,
  });
}

export function useWellnessCheckIns(params?: WellnessQueryParams) {
  return useQuery<PaginatedWellnessCheckInsResponse, Error>({
    queryKey: wellnessQueryKeys.checkIns(params),
    queryFn: () => getWellnessCheckInsApi(params),
    staleTime: 30 * 1000,
  });
}

export function useWellnessCheckIn(id: string) {
  return useQuery<WellnessCheckInResponse, Error>({
    queryKey: wellnessQueryKeys.detail(id),
    queryFn: () => getWellnessCheckInByIdApi(id),
    enabled: Boolean(id),
  });
}

export function useCreateWellnessCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<WellnessCheckInResponse, Error, CreateWellnessCheckInRequest>({
    mutationFn: (data: CreateWellnessCheckInRequest) => createWellnessCheckInApi(data),
    onSuccess: () => {
      // Invalidate wellness queries to update summary, streak, history, and trends
      queryClient.invalidateQueries({ queryKey: wellnessQueryKeys.all });
      // Invalidate health timeline as well
      queryClient.invalidateQueries({ queryKey: ['health-timeline'] });
    },
  });
}

export function useUpdateWellnessCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<
    WellnessCheckInResponse,
    Error,
    { id: string; data: UpdateWellnessCheckInRequest }
  >({
    mutationFn: ({ id, data }) => updateWellnessCheckInApi(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: wellnessQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: wellnessQueryKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['health-timeline'] });
    },
  });
}

export function useDeleteWellnessCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteWellnessCheckInApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellnessQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['health-timeline'] });
    },
  });
}
