/**
 * MANVIA Patient Home / Care Journey Dashboard Route
 * Central authenticated home view for patients:
 * - Time-aware personalized greeting
 * - Nearest upcoming physician consultation
 * - Daily wellness reflection status & streak
 * - Care pathway cards (AI Companion vs Licensed Doctor vs EHR)
 * - Longitudinal health timeline feed
 * - System & clinical notifications
 */

import React from "react";
import { useAuth } from "@/auth/AuthContext";
import { usePatientProfileQuery } from "@/features/patient";
import {
  GreetingHeader,
  UpcomingAppointmentSection,
  WellnessSummarySection,
  CareJourneySection,
  RecentTimelineSection,
  NotificationsSummarySection,
  useUpcomingAppointmentQuery,
  useWellnessSummaryQuery,
  useRecentNotificationsQuery,
  useRecentTimelineQuery,
} from "@/features/dashboard";

export const PatientHomeRoute: React.FC = () => {
  const { user } = useAuth();
  const { data: profile } = usePatientProfileQuery();

  // Independent queries ensuring section-level partial failure resilience
  const upcomingAppointmentQuery = useUpcomingAppointmentQuery();
  const wellnessSummaryQuery = useWellnessSummaryQuery();
  const notificationsQuery = useRecentNotificationsQuery(3);
  const timelineQuery = useRecentTimelineQuery(3);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: "1120px",
        margin: "0 auto",
      }}
      data-testid="patient-home-dashboard"
    >
      {/* 1. Header Greeting & Identity */}
      <GreetingHeader profile={profile} user={user} />

      {/* 2. Top Priority Status: Nearest Upcoming Appointment */}
      <UpcomingAppointmentSection
        appointment={upcomingAppointmentQuery.data}
        isLoading={upcomingAppointmentQuery.isLoading}
        error={upcomingAppointmentQuery.error}
        onRetry={() => upcomingAppointmentQuery.refetch()}
      />

      {/* 3. Core Dashboard Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-6)",
          alignItems: "start",
        }}
      >
        {/* Left Column: Care Pathways & Recent Activity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {/* Care Pathways: AI vs Real Doctor vs EHR */}
          <CareJourneySection />

          {/* Recent Longitudinal Care Feed */}
          <RecentTimelineSection
            events={timelineQuery.data?.data}
            isLoading={timelineQuery.isLoading}
            error={timelineQuery.error}
            onRetry={() => timelineQuery.refetch()}
          />
        </div>

        {/* Right Column: Daily Wellness & Important Updates */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {/* Daily Wellness Check-in Status */}
          <WellnessSummarySection
            summary={wellnessSummaryQuery.data}
            isLoading={wellnessSummaryQuery.isLoading}
            error={wellnessSummaryQuery.error}
            onRetry={() => wellnessSummaryQuery.refetch()}
          />

          {/* Important Notifications Summary */}
          <NotificationsSummarySection
            notifications={notificationsQuery.data?.data}
            unreadCount={notificationsQuery.data?.unreadCount ?? 0}
            isLoading={notificationsQuery.isLoading}
            error={notificationsQuery.error}
            onRetry={() => notificationsQuery.refetch()}
          />
        </div>
      </div>
    </div>
  );
};
