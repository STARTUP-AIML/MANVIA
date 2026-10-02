/**
 * MANVIA Doctor Application Foundation Route
 * Rendered inside DoctorShell.
 */

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const DoctorRoute: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="heading-1">Doctor Clinical Workspace</h1>
          <p className="body-regular">
            Practitioner clinical console. Features will be implemented in Phase
            7 through Phase 11.
          </p>
        </div>
        <Badge variant="success">Phase 0 Shell Active</Badge>
      </div>

      {/* Grid of Planned Capabilities */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              👥
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Patient Queue
            </CardTitle>
            <CardDescription>
              Live patient waiting room, consultation requests, and triage
              status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 7</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              📆
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Schedule &amp; Availability
            </CardTitle>
            <CardDescription>
              Dynamic slot management, recurring availability, and emergency
              blocks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 8</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              📝
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Clinical Notes &amp; Rx
            </CardTitle>
            <CardDescription>
              SOAP note templates, drug interaction alerts, and e-prescriptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 9</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              💳
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Payouts &amp; Earnings
            </CardTitle>
            <CardDescription>
              Settlement reconciliation, payout history, and financial
              statements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 10</Badge>
          </CardContent>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Card>
          <CardHeader>
            <CardTitle>Doctor Layout Foundation</CardTitle>
            <CardDescription>
              The DoctorShell layout and responsive navigation are fully
              configured for Phase 7 implementation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
            >
              ← Back to Overview
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
