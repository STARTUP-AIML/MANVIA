/**
 * MANVIA Application Landing & Foundation Overview
 */

import React from "react";
import { Link } from "react-router-dom";
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

export const LandingRoute: React.FC = () => {
  const portals = [
    {
      title: "Patient Portal",
      description:
        "AI companionship, daily wellness check-ins, appointment scheduling, and personal health records.",
      href: "/app",
      badge: "Foundation Ready",
      icon: "🌿",
    },
    {
      title: "Doctor Portal",
      description:
        "Clinical consultation dashboard, patient queuing, schedule management, and instant payouts.",
      href: "/doctor",
      badge: "Foundation Ready",
      icon: "🩺",
    },
    {
      title: "Admin Console",
      description:
        "Platform governance, doctor verification, financial reconciliation, and comprehensive audit logs.",
      href: "/admin",
      badge: "Foundation Ready",
      icon: "🛡️",
    },
    {
      title: "Developer Diagnostics",
      description:
        "Live frontend diagnostics, backend gateway connectivity status, and OpenAPI / Swagger access.",
      href: "/dev-health",
      badge: "Active Tool",
      icon: "⚡",
    },
  ];

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <main style={{ flex: 1, padding: "var(--space-12) 0" }}>
        <Container>
          {/* Hero Section */}
          <div
            style={{
              textAlign: "center",
              maxWidth: 760,
              margin: "0 auto var(--space-12)",
            }}
          >
            <Badge variant="primary" style={{ marginBottom: "var(--space-3)" }}>
              Frontend Phase 0: Foundation & Project Setup
            </Badge>
            <h1
              className="heading-display"
              style={{ marginBottom: "var(--space-4)" }}
            >
              Care made simpler.
            </h1>
            <p
              className="body-large"
              style={{
                color: "var(--color-text-secondary)",
                marginBottom: "var(--space-6)",
              }}
            >
              MANVIA is an enterprise-grade healthcare and wellness platform
              designed for patients, doctors, and healthcare administrators.
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link to="/app" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg">
                  Launch Patient Portal
                </Button>
              </Link>
              <Link to="/dev-health" style={{ textDecoration: "none" }}>
                <Button variant="secondary" size="lg">
                  Developer Health Check
                </Button>
              </Link>
            </div>
          </div>

          {/* Portal Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-6)",
            }}
          >
            {portals.map((portal) => (
              <Card key={portal.href} interactive>
                <CardHeader>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontSize: "2rem" }} aria-hidden="true">
                      {portal.icon}
                    </span>
                    <Badge variant="neutral">{portal.badge}</Badge>
                  </div>
                  <CardTitle style={{ marginTop: "var(--space-2)" }}>
                    {portal.title}
                  </CardTitle>
                  <CardDescription>{portal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={portal.href} style={{ textDecoration: "none" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ width: "100%" }}
                    >
                      Open Workspace →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};
