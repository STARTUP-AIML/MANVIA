/**
 * MANVIA Platform Health & Infrastructure Diagnostics Route
 * Production diagnostics view located strictly within the Admin workspace (/admin/platform-health).
 * Real-time health checks for frontend client, backend Fastify gateway, database/cache readiness probes,
 * and emergency subsystem kill switch controls.
 * Zero secret or token exposure.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/layout/Container";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { env } from "@/lib/env";
import { useToast } from "@/components/feedback/Toast/ToastContext";
import { getAdminSystemStatusApi, toggleAdminKillSwitchApi } from "@/api/admin";
import type {
  PlatformReadinessResult,
  AdminSystemStatus,
  SubsystemState,
} from "@/types/admin";

interface BackendCheckResult {
  status: "idle" | "checking" | "healthy" | "unreachable";
  statusCode?: number;
  data?: unknown;
  responseTimeMs?: number;
  error?: string;
  checkedAt?: string;
}

export const PlatformHealthRoute: React.FC = () => {
  const toast = useToast();
  const [backendStatus, setBackendStatus] = useState<BackendCheckResult>({
    status: "idle",
  });
  const [readinessResult, setReadinessResult] = useState<PlatformReadinessResult | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [systemStatus, setSystemStatus] = useState<AdminSystemStatus | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemState | null>(null);
  const [justification, setJustification] = useState("");
  const [isTogglingSwitch, setIsTogglingSwitch] = useState(false);

  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Live ping to backend gateway liveness
  const checkBackendLiveness = useCallback(async () => {
    if (!isMountedRef.current) return;
    setBackendStatus({ status: "checking" });
    const startTime = performance.now();

    try {
      const healthUrl = `${env.backendUrl}/health`;
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const responseTimeMs = Math.round(performance.now() - startTime);
      if (!isMountedRef.current) return;

      if (response.ok) {
        let data: unknown;
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }

        if (!isMountedRef.current) return;
        setBackendStatus({
          status: "healthy",
          statusCode: response.status,
          data,
          responseTimeMs,
          checkedAt: new Date().toLocaleTimeString(),
        });
      } else {
        if (!isMountedRef.current) return;
        setBackendStatus({
          status: "unreachable",
          statusCode: response.status,
          responseTimeMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
          checkedAt: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const responseTimeMs = Math.round(performance.now() - startTime);
      setBackendStatus({
        status: "unreachable",
        responseTimeMs,
        error:
          err instanceof Error
            ? err.message
            : "Connection failed. Is backend gateway running?",
        checkedAt: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  // 2. Query backend readiness probe (/health/ready)
  const checkReadiness = useCallback(async () => {
    if (!isMountedRef.current) return;
    setReadinessLoading(true);
    setReadinessError(null);

    try {
      const readyUrl = `${env.backendUrl}/health/ready`;
      const response = await fetch(readyUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!isMountedRef.current) return;
      if (response.ok || response.status === 503) {
        const data = (await response.json()) as PlatformReadinessResult;
        setReadinessResult(data);
      } else {
        setReadinessError(`Readiness probe failed with HTTP ${response.status}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setReadinessError(
        err instanceof Error ? err.message : "Failed to query readiness probe"
      );
    } finally {
      if (isMountedRef.current) {
        setReadinessLoading(false);
      }
    }
  }, []);

  // 3. Query administrative emergency subsystem kill switch status
  const loadSystemStatus = useCallback(async () => {
    if (!isMountedRef.current) return;
    setSystemLoading(true);
    setSystemError(null);

    try {
      const status = await getAdminSystemStatusApi();
      if (!isMountedRef.current) return;
      setSystemStatus(status);
    } catch (err) {
      if (!isMountedRef.current) return;
      setSystemError(
        err instanceof Error
          ? err.message
          : "Failed to retrieve subsystem status (Admin authorization required)"
      );
    } finally {
      if (isMountedRef.current) {
        setSystemLoading(false);
      }
    }
  }, []);

  const checkAllDiagnostics = useCallback(async () => {
    await Promise.all([
      checkBackendLiveness(),
      checkReadiness(),
      loadSystemStatus(),
    ]);
    if (isMountedRef.current) {
      toast.success("Platform health diagnostics updated", "Diagnostics Complete");
    }
  }, [checkBackendLiveness, checkReadiness, loadSystemStatus, toast]);

  // Initial check on mount
  useEffect(() => {
    void checkAllDiagnostics();
  }, [checkAllDiagnostics]);

  // Handle emergency kill switch toggle
  const handleConfirmToggleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubsystem) return;
    if (!justification.trim() || justification.trim().length < 5) {
      toast.error("Justification must be at least 5 characters long", "Validation Error");
      return;
    }

    setIsTogglingSwitch(true);
    try {
      await toggleAdminKillSwitchApi({
        subsystem: selectedSubsystem.subsystem,
        enabled: !selectedSubsystem.enabled,
        justification: justification.trim(),
      });
      toast.success(
        `Subsystem ${selectedSubsystem.subsystem} ${!selectedSubsystem.enabled ? "activated" : "deactivated (kill switch engaged)"}`,
        "Control Updated"
      );
      setSelectedSubsystem(null);
      setJustification("");
      void loadSystemStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to modify subsystem control state",
        "Operation Failed"
      );
    } finally {
      setIsTogglingSwitch(false);
    }
  };

  return (
    <div style={{ padding: "var(--space-6) 0" }} data-testid="platform-health-page">
      <Container>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <h1 className="heading-1" style={{ margin: 0 }}>
                Platform Health Diagnostics
              </h1>
              <Badge variant="warning">ADMIN ONLY</Badge>
            </div>
            <p className="body-regular text-muted" style={{ marginTop: "4px" }}>
              Live verification and telemetry for frontend foundation, backend Fastify gateway, database/cache probes, and emergency subsystem controls.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => void checkAllDiagnostics()}
            disabled={backendStatus.status === "checking" || readinessLoading || systemLoading}
          >
            {backendStatus.status === "checking" || readinessLoading
              ? "Running Probes..."
              : "Re-Check All Diagnostics"}
          </Button>
        </div>

        {/* Diagnostic Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {/* Card 1: Frontend Client Foundation */}
          <Card>
            <CardHeader>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <CardTitle>Frontend Client Foundation</CardTitle>
                <Badge variant="success">HEALTHY</Badge>
              </div>
              <CardDescription>
                React 19 + Vite 6 + TypeScript + TanStack Query
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <div>
                  <strong>Local Client Origin:</strong>{" "}
                  <code
                    style={{
                      background: "var(--manvia-slate-100)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : "http://localhost:5173"}
                  </code>
                </div>
                <div>
                  <strong>Application Environment:</strong>{" "}
                  <Badge variant="neutral">{env.appEnv}</Badge>
                </div>
                <div>
                  <strong>API Client Base URL:</strong>{" "}
                  <code
                    style={{
                      background: "var(--manvia-slate-100)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {env.apiBaseUrl}
                  </code>
                </div>
                <div>
                  <strong>State Management:</strong> Zustand (UI state) + TanStack Query (Server cache)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Backend Gateway & Dependency Readiness */}
          <Card>
            <CardHeader>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <CardTitle>Gateway &amp; Dependencies</CardTitle>
                <Badge
                  variant={
                    readinessResult?.status === "healthy"
                      ? "success"
                      : readinessResult?.status === "degraded"
                      ? "warning"
                      : backendStatus.status === "healthy"
                      ? "info"
                      : "danger"
                  }
                >
                  {readinessResult?.status
                    ? readinessResult.status.toUpperCase()
                    : backendStatus.status === "healthy"
                    ? "GATEWAY CONNECTED"
                    : "UNREACHABLE"}
                </Badge>
              </div>
              <CardDescription>
                Fastify + NestJS + PostgreSQL + Redis Probes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <div>
                  <strong>Liveness Target:</strong>{" "}
                  <span style={{ color: "var(--manvia-primary-700)" }}>{env.backendUrl}/health</span>{" "}
                  ({backendStatus.responseTimeMs ?? "—"}ms)
                </div>

                {/* Database Dependency */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><strong>PostgreSQL Database:</strong></span>
                    <Badge
                      variant={
                        readinessResult?.components?.database?.status === "healthy"
                          ? "success"
                          : "danger"
                      }
                    >
                      {readinessResult?.components?.database?.status?.toUpperCase() || "PENDING"}
                    </Badge>
                  </div>
                  {readinessResult?.components?.database?.responseTimeMs !== undefined && (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Response time: {readinessResult.components.database.responseTimeMs}ms
                    </div>
                  )}
                </div>

                {/* Cache Dependency */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><strong>Redis Cache &amp; Rate Limiter:</strong></span>
                    <Badge
                      variant={
                        readinessResult?.components?.cache?.status === "healthy"
                          ? "success"
                          : "warning"
                      }
                    >
                      {readinessResult?.components?.cache?.status?.toUpperCase() || "PENDING"}
                    </Badge>
                  </div>
                  {readinessResult?.components?.cache?.responseTimeMs !== undefined && (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Response time: {readinessResult.components.cache.responseTimeMs}ms
                    </div>
                  )}
                </div>

                {/* Memory Health */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><strong>Application Memory Heap:</strong></span>
                    <Badge
                      variant={
                        readinessResult?.components?.memory?.status === "healthy"
                          ? "success"
                          : "warning"
                      }
                    >
                      {readinessResult?.components?.memory?.status?.toUpperCase() || "HEALTHY"}
                    </Badge>
                  </div>
                  {readinessResult?.components?.memory?.details && (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Heap: {String(readinessResult.components.memory.details.heapUsed || 0)}MB / {String(readinessResult.components.memory.details.heapTotal || 0)}MB
                    </div>
                  )}
                </div>

                {readinessError && (
                  <div style={{ color: "var(--manvia-danger-700)", fontSize: "12px", marginTop: "4px" }}>
                    ⚠️ {readinessError}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Emergency Subsystem Controls & Kill Switches */}
          <Card>
            <CardHeader>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <CardTitle>Emergency Kill Switches</CardTitle>
                <Badge
                  variant={
                    systemStatus?.status === "OPERATIONAL"
                      ? "success"
                      : "danger"
                  }
                >
                  {systemStatus?.status || "UNKNOWN"}
                </Badge>
              </div>
              <CardDescription>
                Subsystem emergency isolation &amp; administrative overrides
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemLoading ? (
                <div style={{ padding: "1.5rem", textAlign: "center" }}>
                  <Spinner size="sm" />
                </div>
              ) : systemError ? (
                <div style={{ color: "var(--manvia-danger-700)", fontSize: "12px" }}>
                  ⚠️ {systemError}
                </div>
              ) : !systemStatus?.subsystems || systemStatus.subsystems.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  No configurable emergency subsystems found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {systemStatus.subsystems.map((sub) => (
                    <div
                      key={sub.subsystem}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0.75rem",
                        background: sub.enabled ? "#f8fafc" : "#fef2f2",
                        border: `1px solid ${sub.enabled ? "#e2e8f0" : "#fecaca"}`,
                        borderRadius: "6px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                          {sub.subsystem}
                        </div>
                        <div style={{ fontSize: "11px", color: sub.enabled ? "#64748b" : "#dc2626" }}>
                          {sub.enabled ? "Active & Functional" : "DISABLED (Kill Switch Engaged)"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={sub.enabled ? "danger" : "primary"}
                        onClick={() => {
                          setSelectedSubsystem(sub);
                          setJustification("");
                        }}
                      >
                        {sub.enabled ? "Engage Kill Switch" : "Restore Subsystem"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Documentation & Specifications */}
          <Card>
            <CardHeader>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <CardTitle>API Documentation &amp; Schemas</CardTitle>
                <Badge variant="info">DOCS</Badge>
              </div>
              <CardDescription>
                OpenAPI 3.0 &amp; Interactive Swagger Explorer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <div>
                  <strong>Swagger UI:</strong>{" "}
                  <a
                    href={`${env.backendUrl}/docs`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--manvia-primary-700)", fontWeight: 600 }}
                  >
                    {env.backendUrl}/docs &rarr;
                  </a>
                </div>
                <div>
                  <strong>OpenAPI JSON Schema:</strong>{" "}
                  <a
                    href={`${env.backendUrl}/docs-json`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--manvia-primary-700)" }}
                  >
                    {env.backendUrl}/docs-json
                  </a>
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "8px" }}>
                  Documentation endpoints reflect verified backend service contracts. Zero credentials or internal secrets exposed.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal: Kill Switch Toggle Confirmation */}
        {selectedSubsystem && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                maxWidth: "520px",
                width: "100%",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <h2 className="heading-2">
                {selectedSubsystem.enabled
                  ? `Engage Emergency Kill Switch: ${selectedSubsystem.subsystem}`
                  : `Restore Operational Subsystem: ${selectedSubsystem.subsystem}`}
              </h2>
              <p className="body-regular text-muted">
                {selectedSubsystem.enabled
                  ? `Disabling ${selectedSubsystem.subsystem} immediately blocks all traffic to this subsystem for emergency safety or incident response.`
                  : `Re-enabling ${selectedSubsystem.subsystem} restores normal production operations.`}
              </p>

              <form onSubmit={handleConfirmToggleSwitch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="manvia-input-group">
                  <label className="manvia-label">
                    Mandatory Operational Justification <span style={{ color: "#dc2626" }}>*</span> (min. 5 chars)
                  </label>
                  <textarea
                    required
                    className="manvia-input"
                    style={{
                      minHeight: "80px",
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                    }}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="e.g. Disabling AI companion due to upstream vendor degraded performance incident #402..."
                    disabled={isTogglingSwitch}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSubsystem(null)}
                    disabled={isTogglingSwitch}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant={selectedSubsystem.enabled ? "danger" : "primary"}
                    isLoading={isTogglingSwitch}
                    disabled={justification.trim().length < 5}
                  >
                    Confirm {selectedSubsystem.enabled ? "Kill Switch" : "Restoration"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
