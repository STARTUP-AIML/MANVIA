/**
 * MANVIA Dashboard API Service
 * Interacts with authoritative backend endpoints:
 * - GET /api/v1/appointments?upcoming=true&limit=1
 * - GET /api/v1/wellness/summary
 * - GET /api/v1/notifications?limit=3
 * - GET /api/v1/health-timeline?limit=3
 */

import { apiClient } from "@/api/client/apiClient";
import type {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
  WellnessSummaryResponseDto,
  PaginatedNotificationsResponseDto,
  PaginatedTimelineResponseDto,
} from "../types";

export const dashboardService = {
  /**
   * Retrieves the nearest upcoming appointment for the authenticated patient.
   */
  async getUpcomingAppointment(): Promise<AppointmentResponseDto | null> {
    const response = await apiClient.get<PaginatedAppointmentsResponseDto>(
      "appointments",
      {
        params: {
          upcoming: true,
          limit: 1,
        },
      },
    );
    return response.data.length > 0 && response.data[0]
      ? response.data[0]
      : null;
  },

  /**
   * Retrieves the wellness summary and today's check-in status.
   */
  async getWellnessSummary(): Promise<WellnessSummaryResponseDto> {
    return apiClient.get<WellnessSummaryResponseDto>("wellness/summary");
  },

  /**
   * Retrieves recent notifications and unread count.
   */
  async getRecentNotifications(
    limit: number = 3,
  ): Promise<PaginatedNotificationsResponseDto> {
    return apiClient.get<PaginatedNotificationsResponseDto>("notifications", {
      params: { limit },
    });
  },

  /**
   * Retrieves longitudinal health timeline feed.
   */
  async getRecentTimeline(
    limit: number = 3,
  ): Promise<PaginatedTimelineResponseDto> {
    return apiClient.get<PaginatedTimelineResponseDto>("health-timeline", {
      params: { limit },
    });
  },
};
