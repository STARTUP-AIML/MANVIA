/**
 * MANVIA Admin Application Foundation Route
 * Rendered inside AdminShell.
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

export const AdminRoute: React.FC = () => {
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
          <h1 className="heading-1">System Administration Console</h1>
          <p className="body-regular">
            Platform governance and operational console. Features will be
            implemented in Phase 12 through Phase 15.
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
              🛡️
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Practitioner Vetting
            </CardTitle>
            <CardDescription>
              License verification, medical board credentialing, and profile
              approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 12</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              💰
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Financial Reconciliation
            </CardTitle>
            <CardDescription>
              Platform fee audits, refund tracking, and gateway reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 12</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              📜
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Security &amp; Audit Logs
            </CardTitle>
            <CardDescription>
              HIPAA-compliant immutable access trails and intrusion monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 13</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              ⚡
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Platform Telemetry
            </CardTitle>
            <CardDescription>
              Fastify latency metrics, Prisma pool health, and Redis cache hit
              ratios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 14</Badge>
          </CardContent>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Card>
          <CardHeader>
            <CardTitle>Admin Layout Foundation</CardTitle>
            <CardDescription>
              The AdminShell governance layout and navigation are active.
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
