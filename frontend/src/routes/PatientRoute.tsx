/**
 * MANVIA Patient Application Foundation Route
 * Rendered inside PatientShell.
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

export const PatientRoute: React.FC = () => {
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
          <h1 className="heading-1">Patient Care Workspace</h1>
          <p className="body-regular">
            Secure, accessible healthcare navigation. Features will be
            implemented in Phase 2 through Phase 6.
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
              🌱
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Wellness Tracker
            </CardTitle>
            <CardDescription>
              Daily check-ins, sleep tracking, mood analysis, and health
              milestones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 2</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              🤖
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              AI Health Companion
            </CardTitle>
            <CardDescription>
              24/7 symptom triaging, health guidance, and clinical escalation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 3</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              🩺
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Doctor Consultations
            </CardTitle>
            <CardDescription>
              Video consultations, doctor discovery, ratings, and digital
              prescriptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 4 &amp; 5</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span style={{ fontSize: "1.75rem" }} aria-hidden="true">
              📁
            </span>
            <CardTitle style={{ marginTop: "var(--space-2)" }}>
              Health Records (EHR)
            </CardTitle>
            <CardDescription>
              Encrypted lab reports, immunization records, and medical files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="neutral">Planned: Phase 6</Badge>
          </CardContent>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <Card>
          <CardHeader>
            <CardTitle>Shell &amp; Layout Verification</CardTitle>
            <CardDescription>
              The PatientShell responsive navigation, sidebar state, and header
              routing are fully functional.
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
