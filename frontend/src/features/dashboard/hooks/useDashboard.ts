/**
 * MANVIA Dashboard Server-State Hooks
 * Independent TanStack Query hooks ensuring partial failure tolerance across sections.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { dashboardService } from "../api/dashboardService";
import type {
  AppointmentResponseDto,
  WellnessSummaryResponseDto,
  PaginatedNotificationsResponseDto,
  PaginatedTimelineResponseDto,
} from "../types";
import { ApiError } from "@/api/errors/apiError";

export const DASHBOARD_QUERY_KEYS = {
  upcomingAppointment: ["dashboard", "upcoming-appointment"] as const,
  wellnessSummary: ["dashboard", "wellness-summary"] as const,
  notifications: (limit: number) =>
    ["dashboard", "notifications", limit] as const,
  timeline: (limit: number) => ["dashboard", "timeline", limit] as const,
};

/**
 * Hook to retrieve nearest upcoming appointment.
 */
export function useUpcomingAppointmentQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<AppointmentResponseDto | null, ApiError> {
  return useQuery<AppointmentResponseDto | null, ApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.upcomingAppointment,
    queryFn: () => dashboardService.getUpcomingAppointment(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Hook to retrieve patient wellness summary and today's status.
 */
export function useWellnessSummaryQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<WellnessSummaryResponseDto, ApiError> {
  return useQuery<WellnessSummaryResponseDto, ApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.wellnessSummary,
    queryFn: () => dashboardService.getWellnessSummary(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook to retrieve recent notifications and unread count.
 */
export function useRecentNotificationsQuery(
  limit: number = 3,
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedNotificationsResponseDto, ApiError> {
  return useQuery<PaginatedNotificationsResponseDto, ApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.notifications(limit),
    queryFn: () => dashboardService.getRecentNotifications(limit),
    staleTime: 1000 * 60 * 1, // 1 minute
    ...options,
  });
}

/**
 * Hook to retrieve recent health timeline events.
 */
export function useRecentTimelineQuery(
  limit: number = 3,
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedTimelineResponseDto, ApiError> {
  return useQuery<PaginatedTimelineResponseDto, ApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.timeline(limit),
    queryFn: () => dashboardService.getRecentTimeline(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}
