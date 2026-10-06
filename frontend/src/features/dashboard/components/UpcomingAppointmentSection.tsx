/**
 * MANVIA Upcoming Appointment Dashboard Section
 * Displays nearest scheduled physician consultation with exact backend status semantics.
 * Handles loading skeleton, empty state, and localized retry on failure.
 */

import React from "react";
import { Link } from "react-router-dom";
import type { AppointmentResponseDto, AppointmentStatus } from "../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FeedbackVariant } from "@/types/common";
import type { ApiError } from "@/api/errors/apiError";

export interface UpcomingAppointmentSectionProps {
  appointment: AppointmentResponseDto | null | undefined;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

export const UpcomingAppointmentSection: React.FC<
  UpcomingAppointmentSectionProps
> = ({ appointment, isLoading, error, onRetry }) => {
  const getStatusBadgeVariant = (
    status: AppointmentStatus,
  ): FeedbackVariant => {
    switch (status) {
      case "CONFIRMED":
        return "success";
      case "IN_PROGRESS":
        return "primary";
      case "REQUESTED":
      case "RESERVED":
        return "warning";
      case "COMPLETED":
        return "neutral";
      case "CANCELLED":
      case "DECLINED":
      case "EXPIRED":
      case "NO_SHOW":
        return "danger";
      default:
        return "neutral";
    }
  };

  const formatScheduledDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="appointment-loading-skeleton" aria-busy="true">
        <CardHeader>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="60%" height="16px" style={{ marginTop: "4px" }} />
        </CardHeader>
        <CardContent>
          <Skeleton width="80%" height="20px" style={{ marginBottom: "8px" }} />
          <Skeleton width="50%" height="16px" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="appointment-error-card">
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
              Unable to Load Appointments
            </h3>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-1) 0 0 0" }}
            >
              {error.message ||
                "A network error occurred while loading your appointments."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="appointment-retry-button"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active Upcoming Appointment Card
  if (appointment) {
    return (
      <Card data-testid="upcoming-appointment-card">
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
                🩺
              </span>
              <CardTitle style={{ margin: 0 }}>Upcoming Consultation</CardTitle>
            </div>
            <Badge
              variant={getStatusBadgeVariant(appointment.status)}
              data-testid="appointment-status-badge"
            >
              {appointment.status}
            </Badge>
          </div>
          <CardDescription>
            Scheduled telemedicine consultation with your physician.
          </CardDescription>
        </CardHeader>

        <CardContent
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              backgroundColor: "var(--manvia-primary-50)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--manvia-primary-200)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
                data-testid="appointment-doctor-name"
              >
                {appointment.doctorDisplayName || "Verified Physician"}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {appointment.offerTitle || "Clinical Consultation"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  color: "var(--manvia-primary-700)",
                }}
                data-testid="appointment-scheduled-time"
              >
                {formatScheduledDate(appointment.startAt)}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                {appointment.durationMinutes
                  ? `${appointment.durationMinutes} mins`
                  : "30 mins"}{" "}
                • Video
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
            borderTop: "1px solid var(--color-border-subtle)",
            padding: "var(--space-4) var(--space-6)",
          }}
        >
          <Link to="/app/appointments" style={{ textDecoration: "none" }}>
            <Button
              variant="outline"
              size="sm"
              data-testid="view-appointment-btn"
            >
              Manage Appointment
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Empty State: No Upcoming Appointment
  return (
    <Card data-testid="no-upcoming-appointment-card">
      <CardContent
        style={{
          padding: "var(--space-6)",
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
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--manvia-slate-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
            aria-hidden="true"
          >
            📅
          </div>
          <div>
            <h3
              className="heading-3"
              style={{ margin: 0 }}
              data-testid="no-appointment-heading"
            >
              No Upcoming Appointments
            </h3>
            <p
              className="body-secondary"
              style={{ margin: "var(--space-1) 0 0 0" }}
            >
              You have no active consultations scheduled. Book time with a
              certified physician whenever you need care.
            </p>
          </div>
        </div>

        <Link to="/app/doctors" style={{ textDecoration: "none" }}>
          <Button variant="primary" size="sm" data-testid="explore-care-button">
            Book Consultation
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
