/**
 * MANVIA Care Journey Navigation Section
 * Clearly separates and distinguishes:
 * 1. "Talk to Manvia AI" (AI Companion, non-diagnostic assistant)
 * 2. "Consult a Real Doctor" (Licensed human physicians)
 * 3. "Clinical Health Records" (Encrypted EHR)
 */

import React from "react";
import { Link } from "react-router-dom";
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

export const CareJourneySection: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
      data-testid="care-journey-section"
    >
      <div>
        <h2 className="heading-2" style={{ margin: 0 }}>
          Your Care Pathways
        </h2>
        <p
          className="body-regular"
          style={{
            color: "var(--color-text-secondary)",
            margin: "var(--space-1) 0 0 0",
          }}
        >
          Choose between 24/7 automated guidance and licensed medical care.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {/* Pathway 1: AI Health Companion */}
        <Card data-testid="ai-companion-card">
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--manvia-primary-100)",
                  color: "var(--manvia-primary-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
                aria-hidden="true"
              >
                🤖
              </div>
              <Badge variant="primary" data-testid="ai-companion-badge">
                AI • Non-Diagnostic
              </Badge>
            </div>
            <CardTitle style={{ marginTop: "var(--space-3)" }}>
              Talk to Manvia AI
            </CardTitle>
            <CardDescription>
              Instant guidance on symptoms, healthcare navigation, and general
              wellness queries available 24/7.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className="body-secondary"
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              ⚠️ Manvia AI is an automated assistant. It does not replace a
              licensed physician and does not provide clinical diagnoses.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              to="/app/ai"
              style={{ textDecoration: "none", width: "100%" }}
            >
              <Button
                variant="outline"
                size="sm"
                style={{ width: "100%" }}
                data-testid="ai-companion-cta"
              >
                Open AI Companion
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Pathway 2: Licensed Doctor Consultation */}
        <Card data-testid="real-doctor-card">
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--manvia-success-50)",
                  color: "var(--manvia-success-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
                aria-hidden="true"
              >
                🩺
              </div>
              <Badge variant="success" data-testid="real-doctor-badge">
                Licensed Clinicians
              </Badge>
            </div>
            <CardTitle style={{ marginTop: "var(--space-3)" }}>
              Consult a Real Doctor
            </CardTitle>
            <CardDescription>
              Schedule real-time video consultations with board-certified
              physicians for clinical diagnoses and treatment plans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className="body-secondary"
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              Medical credentials, licensing councils, and clinical
              verifications are strictly verified by MANVIA.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              to="/app/consultations"
              style={{ textDecoration: "none", width: "100%" }}
            >
              <Button
                variant="primary"
                size="sm"
                style={{ width: "100%" }}
                data-testid="real-doctor-cta"
              >
                Consult a Doctor
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Pathway 3: Health Records & Lab Results */}
        <Card data-testid="health-records-card">
          <CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--manvia-slate-100)",
                  color: "var(--color-text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                }}
                aria-hidden="true"
              >
                📁
              </div>
              <Badge variant="neutral">Encrypted EHR</Badge>
            </div>
            <CardTitle style={{ marginTop: "var(--space-3)" }}>
              Health Records
            </CardTitle>
            <CardDescription>
              Review uploaded diagnostic reports, lab summaries, and clinical
              documentation securely stored at rest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className="body-secondary"
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              All Protected Health Information (PHI) is encrypted under HIPAA
              and GDPR standards.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              to="/app/records"
              style={{ textDecoration: "none", width: "100%" }}
            >
              <Button
                variant="outline"
                size="sm"
                style={{ width: "100%" }}
                data-testid="records-cta"
              >
                View Records
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
