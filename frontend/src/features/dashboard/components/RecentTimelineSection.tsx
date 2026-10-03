/**
 * MANVIA Recent Activity / Health Timeline Dashboard Section
 * Displays longitudinal care activity feed directly from the backend.
 */

import React from "react";
import type { TimelineEventResponseDto } from "../types";
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

export interface RecentTimelineSectionProps {
  events: TimelineEventResponseDto[] | undefined;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

export const RecentTimelineSection: React.FC<RecentTimelineSectionProps> = ({
  events,
  isLoading,
  error,
  onRetry,
}) => {
  const formatTimestamp = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="timeline-loading-skeleton" aria-busy="true">
        <CardHeader>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="60%" height="16px" style={{ marginTop: "4px" }} />
        </CardHeader>
        <CardContent>
          <Skeleton width="90%" height="20px" style={{ marginBottom: "8px" }} />
          <Skeleton width="80%" height="20px" style={{ marginBottom: "8px" }} />
          <Skeleton width="70%" height="20px" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="timeline-error-card">
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
              Unable to Load Activity Timeline
            </h3>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-1) 0 0 0" }}
            >
              {error.message ||
                "A network error occurred while loading your recent activity."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="timeline-retry-button"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasEvents = events && events.length > 0;

  return (
    <Card data-testid="recent-timeline-card">
      <CardHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              ⏱️
            </span>
            <CardTitle style={{ margin: 0 }}>Recent Care Activity</CardTitle>
          </div>
        </div>
        <CardDescription>
          Your latest check-ins, medical record uploads, and consultation
          events.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {hasEvents ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {events.map((event) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) 0",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
                data-testid={`timeline-event-${event.id}`}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {event.title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-secondary)",
                      marginTop: "2px",
                    }}
                  >
                    {event.summary}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge variant="neutral">
                    {event.eventType.replace(/_/g, " ")}
                  </Badge>
                  <div
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    {formatTimestamp(event.eventTimestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "var(--space-4)",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
            data-testid="timeline-empty-state"
          >
            <p className="body-regular" style={{ margin: 0 }}>
              No recent care activity yet. Your timeline will populate as you
              log check-ins and attend consultations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
