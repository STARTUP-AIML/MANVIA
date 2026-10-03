/**
 * MANVIA Notifications Summary Dashboard Section
 * Displays unread alert count and recent system/care alerts.
 */

import React from "react";
import type { NotificationResponseDto, NotificationSeverity } from "../types";
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
import type { FeedbackVariant } from "@/types/common";
import type { ApiError } from "@/api/errors/apiError";

export interface NotificationsSummarySectionProps {
  notifications: NotificationResponseDto[] | undefined;
  unreadCount: number;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

export const NotificationsSummarySection: React.FC<
  NotificationsSummarySectionProps
> = ({ notifications, unreadCount, isLoading, error, onRetry }) => {
  const getSeverityBadgeVariant = (
    severity: NotificationSeverity,
  ): FeedbackVariant => {
    switch (severity) {
      case "CRITICAL":
      case "WARNING":
        return "warning";
      case "INFO":
        return "primary";
      default:
        return "neutral";
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="notifications-loading-skeleton" aria-busy="true">
        <CardHeader>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="60%" height="16px" style={{ marginTop: "4px" }} />
        </CardHeader>
        <CardContent>
          <Skeleton width="90%" height="20px" style={{ marginBottom: "8px" }} />
          <Skeleton width="75%" height="20px" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="notifications-error-card">
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
              Unable to Load Notifications
            </h3>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-1) 0 0 0" }}
            >
              {error.message ||
                "A network error occurred while retrieving notifications."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="notifications-retry-button"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <Card data-testid="notifications-summary-card">
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
              🔔
            </span>
            <CardTitle style={{ margin: 0 }}>Important Updates</CardTitle>
          </div>
          {unreadCount > 0 && (
            <Badge variant="primary" data-testid="unread-count-badge">
              {unreadCount} Unread
            </Badge>
          )}
        </div>
        <CardDescription>
          Critical healthcare notifications, appointment changes, and security
          alerts.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {hasNotifications ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) 0",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
                data-testid={`notification-item-${item.id}`}
              >
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-secondary)",
                      marginTop: "2px",
                    }}
                  >
                    {item.body}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <Badge variant={getSeverityBadgeVariant(item.severity)}>
                    {item.severity}
                  </Badge>
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
            data-testid="notifications-empty-state"
          >
            <p className="body-regular" style={{ margin: 0 }}>
              You're all caught up. No new notifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
