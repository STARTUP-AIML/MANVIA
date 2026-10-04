import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsApi,
  getNotificationByIdApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  getNotificationPreferencesApi,
  updateNotificationPreferencesApi,
} from '@/api';
import type { NotificationQueryParams, UpdateNotificationPreferenceDto } from '@/types';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (params?: NotificationQueryParams) => ['notifications', 'list', params] as const,
  detail: (id: string) => ['notifications', 'detail', id] as const,
  preferences: ['notifications', 'preferences'] as const,
};

export function useNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => getNotificationsApi(params),
    refetchInterval: 30000, // Poll every 30s for fresh notifications
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.detail(id),
    queryFn: () => getNotificationByIdApi(id),
    enabled: !!id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationReadApi(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.setQueryData(NOTIFICATION_KEYS.detail(updated.id), updated);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotificationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.preferences,
    queryFn: () => getNotificationPreferencesApi(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateNotificationPreferenceDto) => updateNotificationPreferencesApi(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(NOTIFICATION_KEYS.preferences, updated);
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.preferences });
    },
  });
}
