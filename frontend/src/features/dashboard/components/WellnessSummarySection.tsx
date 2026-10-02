/**
 * MANVIA Wellness Summary Dashboard Section
 * Displays daily check-in status, logging streak, and total tracking history.
 * Distinguishes between completed check-in and pending check-in for today.
 */

import React from "react";
import { Link } from "react-router-dom";
import type { WellnessSummaryResponseDto } from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ApiError } from "@/api/errors/apiError";

export interface WellnessSummarySectionProps {
  summary: WellnessSummaryResponseDto | null | undefined;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

export const WellnessSummarySection: React.FC<WellnessSummarySectionProps> = ({
  summary,
  isLoading,
  error,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <Card data-testid="wellness-loading-skeleton" aria-busy="true">
        <CardHeader>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="60%" height="16px" style={{ marginTop: "4px" }} />
        </CardHeader>
        <CardContent>
          <Skeleton width="70%" height="20px" style={{ marginBottom: "8px" }} />
          <Skeleton width="45%" height="16px" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="wellness-error-card">
        <CardContent
          style={{
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "var(--space-3)",
          }}
        >
          <span style={{ fontSize: "1.5rem" }} aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h3 className="heading-3" style={{ margin: 0 }}>
              Unable to Load Wellness Metrics
            </h3>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-1) 0 0 0" }}
            >
              {error.message ||
                "A network error occurred while loading your wellness data."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="wellness-retry-button"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isCompletedToday = Boolean(summary?.todayCheckIn);
  const streakDays = summary?.streakDays ?? 0;
  const totalCheckIns = summary?.totalCheckIns ?? 0;

  return (
    <Card data-testid="wellness-summary-card">
      <CardHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
              🌱
            </span>
            <CardTitle style={{ margin: 0 }}>Daily Wellness Tracking</CardTitle>
          </div>
          <Badge
            variant={isCompletedToday ? "success" : "warning"}
            data-testid="wellness-status-badge"
          >
            {isCompletedToday ? "Completed Today" : "Pending Check-in"}
          </Badge>
        </div>
        <CardDescription>
          Non-diagnostic self-reflection on mood, sleep, stress, and energy.
        </CardDescription>
      </CardHeader>

      <CardContent
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              alignItems: "center",
            }}
          >
            <Badge variant="primary" data-testid="wellness-streak-badge">
              🔥 {streakDays} Day Streak
            </Badge>
            <Badge variant="neutral" data-testid="wellness-total-badge">
              {totalCheckIns} Total Logged
            </Badge>
          </div>
          <p
            className="body-regular"
            style={{ margin: 0, color: "var(--color-text-secondary)" }}
            data-testid="wellness-message"
          >
            {isCompletedToday
              ? "Great job! Your baseline reflection for today has been recorded."
              : "Take 1 minute to record how you are feeling today."}
          </p>
        </div>

        <Link to="/app/wellness" style={{ textDecoration: "none" }}>
          <Button
            variant={isCompletedToday ? "secondary" : "primary"}
            size="sm"
            data-testid="wellness-cta-button"
          >
            {isCompletedToday ? "View Wellness Tracker" : "Start Check-in"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
