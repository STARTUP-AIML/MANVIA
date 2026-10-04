import { apiFetch } from './client';
import type {
  NotificationPreferenceResponseDto,
  NotificationQueryParams,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UpdateNotificationPreferenceDto,
} from '@/types';

/**
 * Lists notifications for authenticated user.
 * GET /api/v1/notifications
 */
export async function getNotificationsApi(
  params?: NotificationQueryParams,
): Promise<PaginatedNotificationsResponseDto> {
  const search = new URLSearchParams();
  if (params?.unreadOnly !== undefined) search.set('unreadOnly', String(params.unreadOnly));
  if (params?.type) search.set('type', params.type);
  if (params?.severity) search.set('severity', params.severity);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));

  const query = search.toString();
  return apiFetch<PaginatedNotificationsResponseDto>(
    query ? `/notifications?${query}` : '/notifications',
  );
}

/**
 * Retrieves a single notification.
 * GET /api/v1/notifications/:id
 */
export async function getNotificationByIdApi(id: string): Promise<NotificationResponseDto> {
  return apiFetch<NotificationResponseDto>(`/notifications/${id}`);
}

/**
 * Marks a notification as read.
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationReadApi(id: string): Promise<NotificationResponseDto> {
  return apiFetch<NotificationResponseDto>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * Marks all notifications for user as read.
 * POST /api/v1/notifications/read-all
 */
export async function markAllNotificationsReadApi(): Promise<{ count: number }> {
  return apiFetch<{ count: number }>('/notifications/read-all', {
    method: 'POST',
  });
}

/**
 * Deletes a notification from user inbox.
 * DELETE /api/v1/notifications/:id
 */
export async function deleteNotificationApi(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Retrieves user notification preferences.
 * GET /api/v1/notifications/preferences
 */
export async function getNotificationPreferencesApi(): Promise<NotificationPreferenceResponseDto> {
  return apiFetch<NotificationPreferenceResponseDto>('/notifications/preferences');
}

/**
 * Updates user notification preferences.
 * PATCH /api/v1/notifications/preferences
 */
export async function updateNotificationPreferencesApi(
  dto: UpdateNotificationPreferenceDto,
): Promise<NotificationPreferenceResponseDto> {
  return apiFetch<NotificationPreferenceResponseDto>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}
