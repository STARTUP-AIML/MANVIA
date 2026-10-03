/**
 * MANVIA Greeting Header Component
 * Personalized, accessible header displaying patient identity and contextual greeting.
 */

import React from "react";
import type { PatientProfileResponseDto } from "@/features/patient";
import type { UserResponseDto } from "@/auth/types";
import { Badge } from "@/components/ui/Badge";

export interface GreetingHeaderProps {
  profile?: PatientProfileResponseDto | null;
  user?: UserResponseDto | null;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = ({
  profile,
  user,
}) => {
  const getGreetingTime = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName =
    profile?.legalFirstName ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "there";

  const publicId = profile?.publicPatientId;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--space-3)",
      }}
      data-testid="greeting-header"
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexWrap: "wrap",
          }}
        >
          <h1
            className="heading-1"
            style={{ margin: 0 }}
            data-testid="greeting-title"
          >
            {getGreetingTime()}, {displayName}
          </h1>
          {publicId && (
            <Badge variant="primary" data-testid="patient-public-id">
              {publicId}
            </Badge>
          )}
          <Badge variant="neutral">Patient Portal</Badge>
        </div>
        <h2
          className="heading-3"
          style={{
            margin: "var(--space-1) 0 0 0",
            color: "var(--manvia-primary-800)",
            fontSize: "var(--font-size-base)",
            fontWeight: 600,
          }}
          data-testid="patient-care-workspace-heading"
        >
          Patient Care Workspace
        </h2>
        <p
          className="body-regular"
          style={{
            color: "var(--color-text-secondary)",
            margin: "var(--space-1) 0 0 0",
          }}
        >
          Care made simpler — your healthcare journey at a glance.
        </p>
      </div>
    </div>
  );
};
