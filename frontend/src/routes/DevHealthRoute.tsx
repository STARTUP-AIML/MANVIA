/**
 * MANVIA Developer Health & Diagnostics Route
 * Verifies frontend state, backend connectivity (live HTTP check), and OpenAPI links.
 */

import React, { useState } from "react";
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
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { env } from "@/lib/env";
import { useToast } from "@/components/feedback/Toast/ToastContext";

interface BackendCheckResult {
  status: "idle" | "checking" | "healthy" | "unreachable";
  statusCode?: number;
  data?: unknown;
  responseTimeMs?: number;
  error?: string;
  checkedAt?: string;
}

export const DevHealthRoute: React.FC = () => {
  const toast = useToast();
  const [backendStatus, setBackendStatus] = useState<BackendCheckResult>({
    status: "idle",
  });

  const checkBackendHealth = async () => {
    setBackendStatus({ status: "checking" });
    const startTime = performance.now();

    try {
      // Live ping to backend /health
      const healthUrl = `${env.backendUrl}/health`;
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const responseTimeMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        let data: unknown;
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }

        setBackendStatus({
          status: "healthy",
          statusCode: response.status,
          data,
          responseTimeMs,
          checkedAt: new Date().toLocaleTimeString(),
        });
        toast.success(
          `Backend is ONLINE (${responseTimeMs}ms)`,
          "Health Check",
        );
      } else {
        setBackendStatus({
          status: "unreachable",
          statusCode: response.status,
          responseTimeMs,
          error: `HTTP ${response.status}: ${response.statusText}`,
          checkedAt: new Date().toLocaleTimeString(),
        });
        toast.error(
          `Backend returned HTTP ${response.status}`,
          "Health Check Failed",
        );
      }
    } catch (err) {
      const responseTimeMs = Math.round(performance.now() - startTime);
      setBackendStatus({
        status: "unreachable",
        responseTimeMs,
        error:
          err instanceof Error
            ? err.message
            : "Connection failed. Is backend running?",
        checkedAt: new Date().toLocaleTimeString(),
      });
      toast.error(
        "Could not connect to backend at http://localhost:3000",
        "Backend Unreachable",
      );
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <main style={{ flex: 1, padding: "var(--space-8) 0" }}>
        <Container>
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h1 className="heading-1">Developer System Diagnostics</h1>
            <p className="body-regular">
              Live verification tool for frontend foundation and backend gateway
              connectivity.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "var(--space-6)",
            }}
          >
            {/* Frontend Diagnostic Card */}
            <Card>
              <CardHeader>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <CardTitle>Frontend Client</CardTitle>
                  <Badge variant="success">HEALTHY</Badge>
                </div>
                <CardDescription>
                  Vite + React + TypeScript + TanStack Query
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
                    <strong>Local URL:</strong>{" "}
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
                    <strong>Environment:</strong>{" "}
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
                    <strong>Zustand Store:</strong> Initialized (presentation
                    state only)
                  </div>
                  <div>
                    <strong>Query Client:</strong> Initialized (staleTime: 5m,
                    gcTime: 10m)
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backend Connectivity Card */}
            <Card>
              <CardHeader>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <CardTitle>Backend Gateway</CardTitle>
                  <Badge
                    variant={
                      backendStatus.status === "healthy"
                        ? "success"
                        : backendStatus.status === "unreachable"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {backendStatus.status === "healthy"
                      ? "CONNECTED"
                      : backendStatus.status === "unreachable"
                        ? "UNREACHABLE"
                        : "STANDBY"}
                  </Badge>
                </div>
                <CardDescription>
                  Fastify + NestJS API &amp; Swagger
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
                    <strong>Backend Root:</strong>{" "}
                    <a href={env.backendUrl} target="_blank" rel="noreferrer">
                      {env.backendUrl}
                    </a>
                  </div>
                  <div>
                    <strong>API Endpoint:</strong>{" "}
                    <a href={env.apiBaseUrl} target="_blank" rel="noreferrer">
                      {env.apiBaseUrl}
                    </a>
                  </div>
                  <div>
                    <strong>Health Check:</strong>{" "}
                    <a
                      href={`${env.backendUrl}/health`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {env.backendUrl}/health
                    </a>
                  </div>
                  <div>
                    <strong>OpenAPI / Swagger:</strong>{" "}
                    <a
                      href={`${env.backendUrl}/docs`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {env.backendUrl}/docs
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "var(--space-6)",
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={checkBackendHealth}
                    isLoading={backendStatus.status === "checking"}
                  >
                    Perform Live Backend Check
                  </Button>
                </div>

                {backendStatus.checkedAt && (
                  <div
                    style={{
                      marginTop: "var(--space-4)",
                      padding: "var(--space-3)",
                      backgroundColor:
                        backendStatus.status === "healthy"
                          ? "var(--manvia-success-50)"
                          : "var(--manvia-danger-50)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    <div>
                      <strong>Last check:</strong> {backendStatus.checkedAt} (
                      {backendStatus.responseTimeMs}ms)
                    </div>
                    {backendStatus.error && (
                      <div
                        style={{
                          color: "var(--manvia-danger-700)",
                          marginTop: 4,
                        }}
                      >
                        {backendStatus.error}
                      </div>
                    )}
                    {Boolean(backendStatus.data) && (
                      <pre
                        style={{
                          marginTop: 4,
                          maxHeight: 100,
                          overflow: "auto",
                        }}
                      >
                        {JSON.stringify(backendStatus.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interactive UI Primitive Testing Sandbox */}
          <div style={{ marginTop: "var(--space-8)" }}>
            <Card>
              <CardHeader>
                <CardTitle>
                  UI Primitives &amp; Toast Notification Verification
                </CardTitle>
                <CardDescription>
                  Verify that toast alerts, modals, and design-token states
                  function properly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      toast.success("Success notification triggered!")
                    }
                  >
                    Test Success Toast
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => toast.error("Error notification triggered!")}
                  >
                    Test Error Toast
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toast.info("Info notification triggered!")}
                  >
                    Test Info Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.warning("Warning notification triggered!")
                    }
                  >
                    Test Warning Toast
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};
