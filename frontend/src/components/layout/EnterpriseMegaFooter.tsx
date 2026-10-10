import React, { useState } from "react";
import { Link } from "react-router-dom";

export const EnterpriseMegaFooter: React.FC = () => {
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeName, setSubscribeName] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!subscribeEmail.trim() || !emailRegex.test(subscribeEmail.trim())) {
      setSubscribeError("Please enter a valid email address.");
      return;
    }

    // Supported in-app subscription state with feedback
    setIsSubscribed(true);
    setSubscribeEmail("");
    setSubscribeName("");
  };

  return (
    <footer
      id="enterprise-footer"
      role="contentinfo"
      aria-label="MANVIA Enterprise Footer"
      style={{
        backgroundColor: "#071828",
        color: "#94a3b8",
        fontFamily: "'Figtree', 'Plus Jakarta Sans', system-ui, sans-serif",
        borderTop: "1px solid rgba(20, 184, 166, 0.15)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Atmospheric Gradient Aura */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "240px",
          background:
            "radial-gradient(ellipse at center, rgba(14, 124, 115, 0.18) 0%, rgba(2, 132, 199, 0.08) 45%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="wrap"
        style={{
          position: "relative",
          zIndex: 2,
          paddingTop: "64px",
          paddingBottom: "48px",
        }}
      >
        {/* ── 1. TOP PRE-FOOTER BANNER: Mission & Updates Subscription ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "36px",
            alignItems: "center",
            paddingBottom: "48px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: "52px",
          }}
        >
          {/* Mission Copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 12px",
                borderRadius: "16px",
                backgroundColor: "rgba(14, 124, 115, 0.25)",
                border: "1px solid rgba(20, 184, 166, 0.35)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#2dd4bf",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              <span>✦</span> Care Intelligence Platform
            </div>
            <h2
              style={{
                margin: "0 0 10px 0",
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
              }}
            >
              Start your journey with human-centred care.
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: 1.6,
                maxWidth: "520px",
              }}
            >
              Bridging proactive wellness and verified clinical care. Seamlessly connect with
              empathetic AI companion support, verified specialists, and secure longitudinal records.
            </p>
          </div>

          {/* Minimal Verified Updates Form */}
          <div
            style={{
              backgroundColor: "rgba(15, 30, 48, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "4px",
              }}
            >
              Subscribe to Healthcare Insights
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "16px",
              }}
            >
              Receive monthly clinical research, wellness guides, and product releases.
            </div>

            {isSubscribed ? (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#34d399",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✓</span> Thank you for subscribing to MANVIA updates!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={subscribeName}
                    onChange={(e) => setSubscribeName(e.target.value)}
                    style={{
                      flex: "1 1 120px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                    required
                    style={{
                      flex: "2 1 180px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.14)",
                      color: "#ffffff",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                {subscribeError && (
                  <div style={{ fontSize: "12px", color: "#f87171" }}>
                    {subscribeError}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Consent-aware • No spam • Unsubscribe anytime
                  </span>
                  <button
                    type="submit"
                    style={{
                      padding: "9px 20px",
                      borderRadius: "10px",
                      backgroundColor: "#0d9488",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "12.5px",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0f766e")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0d9488")}
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── 2. ENTERPRISE NAVIGATION COLUMNS (Nebius Architecture) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "36px 24px",
            marginBottom: "56px",
          }}
        >
          {/* Column A: Platform */}
          <div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "18px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Platform
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <Link to="/app" style={footerLinkStyle}>
                  Patient Portal
                </Link>
              </li>
              <li>
                <Link to="/doctor" style={footerLinkStyle}>
                  Doctor Workspace
                </Link>
              </li>
              <li>
                <Link to="/admin" style={footerLinkStyle}>
                  Admin Console
                </Link>
              </li>
              <li>
                <Link to="/app/ai" style={footerLinkStyle}>
                  AI Companion
                </Link>
              </li>
              <li>
                <Link to="/app/wellness" style={footerLinkStyle}>
                  Wellness Hub
                </Link>
              </li>
              <li>
                <Link to="/app/appointments" style={footerLinkStyle}>
                  Appointments
                </Link>
              </li>
              <li>
                <Link to="/app/health-records" style={footerLinkStyle}>
                  Health Records
                </Link>
              </li>
              <li>
                <Link to="/app/health-timeline" style={footerLinkStyle}>
                  Health Timeline
                </Link>
              </li>
            </ul>
          </div>

          {/* Column B: Healthcare Solutions */}
          <div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "18px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Solutions
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <Link to="/app/doctors" style={footerLinkStyle}>
                  Psychiatry & Mental Health
                </Link>
              </li>
              <li>
                <Link to="/app/doctors" style={footerLinkStyle}>
                  General Practice Care
                </Link>
              </li>
              <li>
                <Link to="/app/doctors" style={footerLinkStyle}>
                  Neurology & Neuroscience
                </Link>
              </li>
              <li>
                <Link to="/app/doctors" style={footerLinkStyle}>
                  Coordinated Care Medicine
                </Link>
              </li>
              <li>
                <a href="#about" style={footerLinkStyle}>
                  Telehealth Consultations
                </a>
              </li>
              <li>
                <a href="#capabilities" style={footerLinkStyle}>
                  Pre-Consultation Intake
                </a>
              </li>
              <li>
                <a href="#journey" style={footerLinkStyle}>
                  Human Care Escalation
                </a>
              </li>
            </ul>
          </div>

          {/* Column C: Resources */}
          <div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "18px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Resources
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <a href="#about" style={footerLinkStyle}>
                  Care Ecosystem Guide
                </a>
              </li>
              <li>
                <a href="#capabilities" style={footerLinkStyle}>
                  Platform Capabilities
                </a>
              </li>
              <li>
                <a href="#journey" style={footerLinkStyle}>
                  Patient Care Journey
                </a>
              </li>
              <li>
                <Link to="/app/doctors" style={footerLinkStyle}>
                  Indian Doctor Directory
                </Link>
              </li>
              <li>
                <a href="#services" style={footerLinkStyle}>
                  Consultation Pricing Guide
                </a>
              </li>
              <li>
                <Link to="/dev-health" style={footerLinkStyle}>
                  System Health & Uptime
                </Link>
              </li>
            </ul>
          </div>

          {/* Column D: Company & Trust */}
          <div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "18px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Company & Trust
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <a href="#about" style={footerLinkStyle}>
                  About MANVIA
                </a>
              </li>
              <li>
                <a href="#about" style={footerLinkStyle}>
                  Mission & Values
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Responsible Healthcare AI
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Clinical Oversight Charter
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Data Governance & Consent
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Security & Encryption
                </a>
              </li>
            </ul>
          </div>

          {/* Column E: Legal & Compliance */}
          <div>
            <h3
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "18px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              Legal & Compliance
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Cookie Settings
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Accessibility Statement
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  Clinical Disclaimer
                </a>
              </li>
              <li>
                <a href="#trust" style={footerLinkStyle}>
                  DPDP & HIPAA Alignment
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── 3. CLINICAL HEALTHCARE DISCLAIMER ── */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "14px",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            fontSize: "12px",
            lineHeight: 1.6,
            color: "#64748b",
            marginBottom: "40px",
          }}
        >
          <strong style={{ color: "#94a3b8" }}>Clinical & Safety Notice: </strong>
          MANVIA is an intelligent healthcare coordination, lifestyle wellness, and clinical discovery platform.
          The AI Companion provides conversational triage and empathetic wellness guidance but is not a licensed physician
          and does not provide formal medical diagnoses, emergency care, or prescription decisions. For acute medical emergencies,
          please contact your local hospital emergency services immediately.
        </div>

        {/* ── 4. GIANT BRAND SIGNATURE (Inspired by Nebius Wordmark Reference) ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "24px",
            paddingBottom: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            marginBottom: "32px",
          }}
        >
          {/* Authentic Logo Badge + Tagline */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                border: "2px solid #2dd4bf",
                boxShadow: "0 4px 16px rgba(45, 212, 191, 0.25)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                padding: "4px",
              }}
            >
              <img
                src="/manvia-original-logo.jpg"
                alt="MANVIA"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                MANVIA
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#2dd4bf",
                  fontWeight: 600,
                }}
              >
                Care that feels human.
              </div>
            </div>
          </div>

          {/* Giant Monumental Wordmark */}
          <div
            aria-hidden="true"
            style={{
              fontSize: "clamp(3.8rem, 11vw, 8.5rem)",
              fontWeight: 900,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              letterSpacing: "0.06em",
              lineHeight: 0.9,
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(20, 184, 166, 0.45) 0%, rgba(14, 124, 115, 0.12) 65%, transparent 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              userSelect: "none",
            }}
          >
            MANVIA
          </div>
        </div>

        {/* ── 5. BOTTOM BAR: Legal, Copyright & Quick Links ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <div>
            © 2026 MANVIA Health Technologies Inc. All rights reserved. • Built for Connected Indian Healthcare.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <a href="#trust" style={subLegalLinkStyle}>
              Privacy Policy
            </a>
            <a href="#trust" style={subLegalLinkStyle}>
              Terms of Service
            </a>
            <a href="#trust" style={subLegalLinkStyle}>
              Cookie Preferences
            </a>
            <a href="#trust" style={subLegalLinkStyle}>
              Accessibility Statement
            </a>
            <Link to="/login" style={subLegalLinkStyle}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

const footerLinkStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#94a3b8",
  textDecoration: "none",
  transition: "color 0.15s ease",
  display: "inline-block",
};

const subLegalLinkStyle: React.CSSProperties = {
  color: "#64748b",
  textDecoration: "none",
  transition: "color 0.15s ease",
};
