/**
 * MANVIA Application Landing & Portal Navigation
 * Combines the pixel-matched Aushvaira/MANVIA reference design with interactive AI preview,
 * modes, services, ecosystem, and portal workspaces for Patient, Doctor, Admin, and Developer Diagnostics.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const services = [
  ["✦", "AI Health Assistant", "Get instant guidance"],
  ["▣", "Appointments", "Book with trusted doctors"],
  ["⌬", "Diagnostics", "Check your health"],
  ["▤", "Medicines", "Order & get delivered"],
  ["▥", "Health Records", "Access your reports"],
  ["◌", "Wellness", "Track your well-being"],
  ["♙", "Doctors", "Find the right specialist"],
  ["♧", "Emergency Support", "Help when you need it most"],
];

function Ecosystem() {
  return (
    <section className="ecosystem wrap" id="about">
      <div className="eco-copy">
        <div className="eyebrow">THE INTELLIGENCE LAYER</div>
        <h2>
          A Connected Healthcare
          <br />
          Ecosystem
        </h2>
        <p>
          Bringing together patients, doctors, hospitals, diagnostics and more — powered by AI, for
          better decisions and healthier lives.
        </p>
        <button className="outline eco-btn" type="button">
          Know More <span>→</span>
        </button>
      </div>

      <div className="eco-orbit">
        <div className="orbit-center">
          <div className="orbit-mark">
            <span style={{ fontSize: "28px", color: "#0ba9e7" }}>✦</span>
          </div>
          <div className="orbit-title">MANVIA</div>
          <div className="orbit-sub">INTELLIGENCE LAYER</div>
        </div>
      </div>
    </section>
  );
}

function Assistant() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ["Instant Answers", "Symptom Checker", "Medication Reminders", "Health Records"];
  return (
    <section className="assistant wrap" id="features">
      <div className="eyebrow" style={{ textAlign: "center", marginBottom: "8px" }}>
        YOUR 24/7 HEALTH COMPANION
      </div>
      <h2>Meet the MANVIA AI Assistant</h2>
      <p className="assistant-sub">
        Always ready to help you navigate your health journey — from quick questions to detailed insights.
      </p>

      <div className="assistant-tabs" role="tablist" aria-label="Assistant features">
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={activeTab === i}
            className={`tab ${activeTab === i ? "active" : ""}`}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="assistant-preview">
        <div className="assistant-preview-top">
          <div className="dots">
            <span />
            <span />
            <span />
          </div>
          <div className="assistant-title">
            <img src="/manvia-ai-avatar.png" alt="MANVIA AI" className="assistant-logo" />
            MANVIA AI Companion
          </div>
          <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>● Online</div>
        </div>

        <div className="assistant-chat">
          <div className="chat-msg bot">
            <img src="/manvia-ai-avatar.png" alt="" className="chat-avatar" />
            <div className="chat-bubble">
              Hello! I'm your MANVIA health companion. How can I help you today? You can ask about
              symptoms, medications, or book a consultation with our verified specialists.
            </div>
          </div>
          <div className="chat-msg user">
            <div className="chat-bubble">
              Can you help me understand my blood test report and suggest next steps?
            </div>
            <div className="chat-avatar user-avatar">U</div>
          </div>
          <div className="chat-msg bot">
            <img src="/manvia-ai-avatar.png" alt="" className="chat-avatar" />
            <div className="chat-bubble">
              I'd be glad to help analyze your test results! Please upload your document securely to your
              Health Records, and I'll summarize the key findings for your doctor's review.
            </div>
          </div>
        </div>

        <div className="assistant-input-bar">
          <input
            type="text"
            placeholder="Ask MANVIA AI anything about your health..."
            disabled
            aria-label="Ask MANVIA AI preview"
          />
          <button className="primary small" type="button" aria-label="Send message preview">
            Ask <span>↗</span>
          </button>
        </div>

        <div className="assistant-badges">
          <span>
            <span className="badge-dot" />
            <small>HIPAA &amp; ABDM Aligned</small>
          </span>
          <span>
            <span className="badge-dot" />
            <small>Verified Clinical Taxonomies</small>
          </span>
          <span>
            <span className="badge-dot" />
            <small>Safe &amp; Supportive</small>
          </span>
        </div>
      </div>
    </section>
  );
}

function Modes() {
  const modes: [string, string, string, string, string][] = [
    ["Guest Mode", "Explore MANVIA and learn more about our services.", "mode-guest.jpg", "♙", "/"],
    ["User Mode", "Your personal health and wellness journey.", "mode-user.jpg", "♧", "/app"],
    ["EMP Mode", "Healthcare operations and patient management.", "mode-emp.jpg", "♙", "/doctor"],
    ["Admin Mode", "Platform management, users, security and more.", "mode-admin.jpg", "♢", "/admin"],
  ];
  return (
    <section className="modes wrap" id="everyone">
      <div className="modes-intro">
        <div className="eyebrow">ONE PLATFORM. FOUR WAYS TO CONNECT.</div>
        <h2>Choose Your Mode</h2>
        <p>
          Whether you're a patient, healthcare staff, organization admin or just exploring — MANVIA
          is here for you.
        </p>
        <a href="#features">Learn More →</a>
      </div>
      {modes.map((m) => (
        <Link to={m[4] ?? "/"} className="mode-card" key={m[0]} style={{ textDecoration: "none" }}>
          <div
            className="mode-card-img"
            style={{ backgroundImage: `url('/${m[2]}')` }}
          />
          <div className="mode-card-body">
            <div className="mode-icon">{m[3]}</div>
            <div className="mode-name">{m[0]}</div>
            <p className="mode-desc">{m[1]}</p>
            <div className="mode-link">
              Explore <span>→</span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

export const LandingRoute: React.FC = () => {
  const navigate = useNavigate();

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppHeader />

      <main id="home" role="main" style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <Badge variant="primary" style={{ marginBottom: "var(--space-3)" }}>
              Frontend Phase 0: Foundation &amp; Project Setup
            </Badge>
            <h1 className="heading-display" style={{ marginBottom: "var(--space-4)" }}>
              Care made simpler.
            </h1>
            <p className="hero-sub" style={{ marginBottom: "var(--space-6)" }}>
              Your health journey, with intelligence that cares. MANVIA connects people, healthcare professionals and intelligent healthcare services in one trusted experience.
            </p>
            <div className="hero-actions" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/wellness")}
                aria-label="Open Wellness Hub"
              >
                Open Wellness Hub
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/app")}
              >
                Launch Patient Portal
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate("/dev-health")}
              >
                Developer Health Check
              </Button>
            </div>
          </div>
        </section>

        {/* Portal Cards Grid */}
        <section className="wrap" style={{ padding: "40px 0" }}>
          <div className="eyebrow" style={{ textAlign: "center", marginBottom: "8px" }}>
            PORTAL WORKSPACES
          </div>
          <h2 style={{ textAlign: "center", marginBottom: "32px" }}>
            Access Your Dedicated Console
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
                    <Button variant="outline" size="sm" style={{ width: "100%" }}>
                      Open Workspace →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Ecosystem />
        <Assistant />
        <Modes />

        {/* Services Grid */}
        <section className="services wrap" id="services">
          <div className="services-head">
            <div className="eyebrow">COMPREHENSIVE CARE</div>
            <h2>Healthcare Services Built Around You</h2>
            <p>
              From primary consultations to longitudinal wellness tracking, MANVIA connects every
              aspect of your care.
            </p>
          </div>
          <div className="services-grid">
            {services.map((s) => (
              <div className="service-card" key={s[1]}>
                <div className="service-icon">{s[0]}</div>
                <div className="service-title">{s[1]}</div>
                <div className="service-desc">{s[2]}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer" role="contentinfo">
        <div className="wrap footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/manvia-logo-mark.png" alt="MANVIA" className="footer-logo-img" />
              <span>MANVIA</span>
            </div>
            <p>Care made simpler. Next-generation healthcare intelligence platform.</p>
          </div>
          <div className="footer-bottom">
            <p>© 2026 MANVIA Health Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingRoute;
