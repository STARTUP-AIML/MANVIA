import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
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

export function useNotifications(params?: NotificationQueryParams, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => getNotificationsApi(params),
    refetchInterval: isAuthReady ? 30000 : false, // Poll every 30s only when authenticated
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
  });
}

export function useNotification(id: string, options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: NOTIFICATION_KEYS.detail(id),
    queryFn: () => getNotificationByIdApi(id),
    ...options,
    enabled: isAuthReady && Boolean(id) && (options?.enabled ?? true),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationReadApi(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotificationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useNotificationPreferences(options?: { enabled?: boolean }) {
  const { isAuthenticated, status } = useAuth();
  const isAuthReady = isAuthenticated && status === "AUTHENTICATED";
  return useQuery({
    queryKey: NOTIFICATION_KEYS.preferences,
    queryFn: () => getNotificationPreferencesApi(),
    ...options,
    enabled: isAuthReady && (options?.enabled ?? true),
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
