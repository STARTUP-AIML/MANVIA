/**
 * MANVIA Product Landing Page
 * Premium AI Healthcare Platform Client Experience
 * "Care that feels human."
 *
 * Integrates the MANVIA Care Intelligence Core 3D ecosystem,
 * scroll choreography, interactive healthcare nodes, and accessible fallbacks.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { EnterpriseMegaFooter } from "@/components/layout/EnterpriseMegaFooter";
import { SplashScreen } from "@/features/splash";
import {
  CanvasContainer,
  HeroEcosystemScene,
  InteractiveEcosystem,
  CareJourneyScene,
  TrustShieldScene,
  ManviaCore,
  useReducedMotion,
} from "@/components/three";

const implementedServices = [
  {
    ico: "✦",
    title: "AI Companion",
    sub: "24/7 conversational support and care triage guidance",
  },
  {
    ico: "◌",
    title: "Wellness Hub",
    sub: "Daily mood, stress, sleep & longitudinal lifestyle tracking",
  },
  {
    ico: "▥",
    title: "Health Timeline",
    sub: "Unified chronological record of care milestones & consults",
  },
  {
    ico: "▤",
    title: "Health Records",
    sub: "Secure, consent-governed clinical documents & lab reports",
  },
  {
    ico: "♙",
    title: "Find a Doctor",
    sub: "Discover verified specialist profiles & clinical specialties",
  },
  {
    ico: "▣",
    title: "Appointments",
    sub: "Seamless slot booking, schedule tracking & visit management",
  },
  {
    ico: "⌬",
    title: "Pre-consultation",
    sub: "Structured intake questionnaires before your appointments",
  },
  {
    ico: "♧",
    title: "Human Escalation",
    sub: "Smooth handoff from AI guidance to licensed clinicians",
  },
];

const previewScenarios = [
  {
    chip: "Daily Check-in",
    userText:
      "I want to track how my sleep has been affecting my energy this week.",
    botReply:
      "You can record daily sleep duration and energy scores in your Wellness Hub to review longitudinal trends and personalized lifestyle insights.",
  },
  {
    chip: "Preparing for Visit",
    userText:
      "What should I have ready before my specialist appointment tomorrow?",
    botReply:
      "You can upload recent lab reports to your Health Records and complete your pre-consultation intake questionnaire so your physician has full context.",
  },
  {
    chip: "Care Escalation",
    userText:
      "I have persistent symptoms that need medical attention from a doctor.",
    botReply:
      "I'll help you find an appropriate specialist on MANVIA, check upcoming consultation availability, and reserve a confirmed appointment.",
  },
];

/* ─── 1. ECOSYSTEM SECTION ─────────────────────────────────── */
function EcosystemSection() {
  return (
    <section className="section-ecosystem wrap" id="ecosystem">
      <div className="section-header-centered" id="about">
        <div className="eyebrow pill">THE INTELLIGENCE LAYER</div>
        <h2>A Connected Healthcare Universe</h2>
        <p>
          Harmonizing empathetic AI guidance, daily proactive wellness, verified clinicians,
          real-time appointments, and longitudinal medical records through the MANVIA Care Intelligence Core.
        </p>
      </div>

      <InteractiveEcosystem />
    </section>
  );
}

/* ─── 2. AI COMPANION SECTION ──────────────────────────────── */
function AICompanionSection() {
  const navigate = useNavigate();
  const [activeScenario, setActiveScenario] = useState(0);
  const currentScenario =
    previewScenarios[activeScenario] ?? previewScenarios[0]!;

  return (
    <section className="section-ai-companion wrap" id="ai-companion">
      <div className="ai-companion-grid">
        {/* Left: Copy & Value Proposition */}
        <div className="ai-companion-info">
          <div className="eyebrow pill">YOUR AI COMPANION</div>
          <h2>
            A little intelligence,
            <br />
            whenever you need it.
          </h2>
          <p>
            Talk, type or speak — MANVIA AI is here 24/7 to listen, guide and
            support your personal health journey. Seamlessly escalate to
            licensed doctors whenever clinical care is needed.
          </p>

          <div className="ai-feature-list">
            <div className="ai-feature-item">
              <span className="ai-feature-bullet">✦</span>
              <div>
                <strong>24/7 Always On</strong>
                <span>Instant conversational triage and empathetic listening</span>
              </div>
            </div>
            <div className="ai-feature-item">
              <span className="ai-feature-bullet">⌬</span>
              <div>
                <strong>Structured Intake</strong>
                <span>Organize symptoms before specialist appointments</span>
              </div>
            </div>
            <div className="ai-feature-item">
              <span className="ai-feature-bullet">🛡</span>
              <div>
                <strong>Privacy-First & Consent-Aware</strong>
                <span>Your conversations remain private and under your control</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <button
              className="primary"
              type="button"
              onClick={() => navigate("/app/ai")}
            >
              Try AI Assistant <span>→</span>
            </button>
          </div>
        </div>

        {/* Right: Floating 3D Perspective Product Interface */}
        <div className="floating-assistant-wrap">
          <div className="assistant-card">
            <div className="assistant-main">
              <div className="assistant-title">
                <img
                  src="/manvia-companion-portrait.jpg"
                  alt="MANVIA AI"
                  className="assistant-logo"
                />
                <div className="assistant-info">
                  <b>MANVIA AI Companion</b>
                  <small>
                    <i /> Active • Secure
                  </small>
                </div>
                <span className="preview-pill">Product preview</span>
                <button
                  className="assistant-close"
                  type="button"
                  aria-label="Cycle assistant preview scenario"
                  onClick={() =>
                    setActiveScenario(
                      (prev) => (prev + 1) % previewScenarios.length,
                    )
                  }
                  title="Next preview scenario"
                >
                  ↻
                </button>
              </div>

              <div
                className="assistant-chips"
                role="tablist"
                aria-label="Interactive preview scenarios"
              >
                {previewScenarios.map((preset, idx) => (
                  <button
                    key={preset.chip}
                    type="button"
                    role="tab"
                    aria-selected={activeScenario === idx}
                    className={`assistant-chip ${activeScenario === idx ? "active" : ""}`}
                    onClick={() => setActiveScenario(idx)}
                  >
                    {preset.chip}
                  </button>
                ))}
              </div>

              <div className="chat-messages" aria-live="polite">
                <div className="chat-row bot">
                  <img
                    src="/manvia-companion-portrait.jpg"
                    alt=""
                    className="chat-avatar"
                  />
                  <div className="bubble bot">
                    Hello! How can I assist with your care journey today?
                  </div>
                </div>

                <div className="chat-row user">
                  <div className="bubble user">{currentScenario.userText}</div>
                </div>

                <div className="chat-row bot">
                  <img
                    src="/manvia-companion-portrait.jpg"
                    alt=""
                    className="chat-avatar"
                  />
                  <div className="bubble bot">{currentScenario.botReply}</div>
                </div>
              </div>

              <div className="chat-input-wrap">
                <button
                  className="chat-mic-btn"
                  type="button"
                  aria-label="Voice input preview"
                  onClick={() => navigate("/app/ai")}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </button>
                <div
                  className="chat-input"
                  role="button"
                  tabIndex={0}
                  aria-label="Open AI Companion in patient workspace"
                  onClick={() => navigate("/app/ai")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate("/app/ai");
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <span>Explore full companion in patient workspace...</span>
                  <span className="chat-send-icon">↗</span>
                </div>
              </div>
              <p className="assistant-disclaimer">
                * Product preview demonstration. Does not provide clinical
                diagnosis.
              </p>
            </div>

            <div className="assistant-side">
              <span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <small>Text Guidance</small>
              </span>
              <span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <small>Voice Triage</small>
              </span>
              <span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <small>24/7 Always On</small>
              </span>
              <span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <small>Consent-Aware</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 3. CAPABILITIES SECTION ──────────────────────────────── */
function CapabilitiesSection() {
  const navigate = useNavigate();

  const capabilities = [
    {
      num: "01",
      title: "MANVIA AI",
      desc: "24/7 intelligent health companion for triage questions, symptom guidance, and empathetic support.",
      icon: "✦",
      path: "/app/ai",
      actionText: "Try AI Assistant",
      accent: "#0ea5e9",
    },
    {
      num: "02",
      title: "Wellness",
      desc: "Daily check-ins, mood tracking, sleep duration, stress monitoring, and longitudinal wellness trends.",
      icon: "◌",
      path: "/app/wellness",
      actionText: "Open Wellness",
      accent: "#10b981",
    },
    {
      num: "03",
      title: "Real Doctor Care",
      desc: "Book consultations with verified medical specialists, complete pre-consultations, and manage visits.",
      icon: "♙",
      path: "/app/doctors",
      actionText: "Find Doctors",
      accent: "#2563eb",
    },
    {
      num: "04",
      title: "Health Records",
      desc: "Secure, consent-aware repository for clinical documents, timeline history, and auditable access.",
      icon: "▥",
      path: "/app/health-records",
      actionText: "View Records",
      accent: "#6366f1",
    },
  ];

  return (
    <section className="section-capabilities wrap" id="capabilities">
      <div className="section-header-split">
        <div>
          <div className="eyebrow pill">DESIGNED FOR YOUR CARE</div>
          <h2>Core Capabilities</h2>
          <p>
            Everything you need for longitudinal health, proactive wellness,
            and expert medical consultations in one coordinated platform.
          </p>
        </div>
        <a href="#services" className="outline" style={{ alignSelf: "flex-end" }}>
          View All Services <span>→</span>
        </a>
      </div>

      <div className="capability-grid">
        {capabilities.map((c) => (
          <div
            className="capability-card"
            key={c.title}
            role="button"
            tabIndex={0}
            aria-label={`Learn more about ${c.title}`}
            onClick={() => navigate(c.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(c.path);
              }
            }}
          >
            <div className="capability-top">
              <span className="capability-num">{c.num}</span>
              <span
                className="capability-icon"
                style={{ color: c.accent, borderColor: `${c.accent}40` }}
              >
                {c.icon}
              </span>
            </div>

            <div className="capability-body">
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>

            <div className="capability-footer">
              <span className="capability-action">{c.actionText}</span>
              <button
                className="capability-arrow-btn"
                aria-label={`Explore ${c.title}`}
                type="button"
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 4. CARE JOURNEY SECTION (NEW) ────────────────────────── */
function CareJourneySection() {
  return (
    <section className="section-journey wrap" id="journey">
      <div className="section-header-centered">
        <div className="eyebrow pill">CONTINUITY OF CARE</div>
        <h2>Your care journey, connected.</h2>
        <p>
          Experience an unbroken circle of care — from discovering symptom
          signals to understanding insights, consulting specialists, tracking
          milestones, and improving long-term health.
        </p>
      </div>

      <CareJourneyScene />
    </section>
  );
}

/* ─── 5. SERVICES SECTION ──────────────────────────────────── */
function ServicesSection() {
  return (
    <section className="section-services wrap" id="services">
      <div className="section-header-centered">
        <div className="eyebrow pill">COMPREHENSIVE CARE SUITE</div>
        <h2>
          Healthcare Services for
          <br />
          Every Need
        </h2>
        <p>
          From everyday wellness tracking to licensed doctor consultations,
          MANVIA supports every step of your health journey with safety and
          precision.
        </p>
      </div>

      <div className="service-grid-modern">
        {implementedServices.map((svc) => (
          <div className="service-card-modern" key={svc.title}>
            <div className="service-icon-modern">{svc.ico}</div>
            <div className="service-text-modern">
              <b>{svc.title}</b>
              <span>{svc.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── 6. TRUST / SECURITY SECTION ──────────────────────────── */
function TrustSection() {
  const navigate = useNavigate();

  return (
    <section className="section-trust wrap" id="trust">
      <div className="trust-container">
        <div className="trust-content">
          <div className="eyebrow pill">FOR A HEALTHIER TOMORROW</div>
          <h2>
            Trusted. Secure.
            <br />
            Human.
          </h2>
          <p>
            Protected with access controls, auditable permissions, and
            privacy-first architecture. Your data is always consent-governed
            and guarded by human clinical oversight.
          </p>

          <div className="trust-pillars">
            <span>🛡 Privacy-First</span>
            <span>✓ Consent-Governed</span>
            <span>⚖ Auditable Access</span>
            <span>✦ Human Oversight</span>
          </div>

          <div style={{ marginTop: "24px" }}>
            <button
              className="primary"
              onClick={() => navigate("/app")}
              type="button"
              aria-label="Explore Patient Workspace"
            >
              Explore Patient Workspace <span>→</span>
            </button>
          </div>
        </div>

        <div className="trust-visual">
          <TrustShieldScene />
        </div>
      </div>
    </section>
  );
}

/* ─── 7. FINAL CALL TO ACTION ──────────────────────────────── */
function FinalCTASection() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="section-final-cta wrap">
      <div className="final-cta-card">
        {/* Background Ambient 3D Intelligence Core */}
        <div className="final-cta-canvas-bg" aria-hidden="true">
          <CanvasContainer
            cameraPosition={[0, 0, 4.5]}
            fov={40}
            ariaLabel="Ambient MANVIA Intelligence Core"
          >
            <ManviaCore
              scale={1.3}
              reducedMotion={prefersReducedMotion}
              highlight
            />
          </CanvasContainer>
        </div>

        <div className="final-cta-content">
          <div className="eyebrow pill">CONNECTED CARE TODAY</div>
          <h2>Healthcare should feel human.</h2>
          <p>
            Join thousands of patients and clinicians experiencing the next
            generation of empathetic, intelligent, and proactive healthcare.
          </p>

          <div className="final-cta-actions">
            <button
              className="primary"
              onClick={() => navigate("/app")}
              type="button"
              aria-label="Launch Patient Workspace"
            >
              Launch Patient Workspace <span>→</span>
            </button>
            <button
              className="outline"
              onClick={() => {
                const el = document.getElementById("capabilities");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/app");
                }
              }}
              type="button"
              aria-label="Explore Capabilities"
            >
              Explore Capabilities <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── MAIN LANDING ROUTE ───────────────────────────────────── */
export const LandingRoute: React.FC = () => {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem("manvia_splash_shown");
    } catch {
      return false;
    }
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
      }}
    >
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            try {
              sessionStorage.setItem("manvia_splash_shown", "true");
            } catch {
              // ignore
            }
            setShowSplash(false);
          }}
        />
      )}

      <LandingHeader />

      <main id="home" role="main" style={{ flex: 1 }}>
        {/* ── 1. HERO ────────────────────────────────────────── */}
        <section className="hero-modern">
          <div className="wrap hero-inner-modern">
            {/* Left Content */}
            <div className="hero-copy-modern">
              <div className="eyebrow pill">INTELLIGENCE FOR BETTER CARE</div>
              <h1 className="hero-title-modern">
                Care that feels <em>human.</em>
              </h1>
              <p className="hero-sub-modern">
                Your health journey, with intelligence that cares. MANVIA
                connects patients, verified clinicians, and proactive wellness
                in one trusted, unified experience.
              </p>

              <div className="hero-actions-modern">
                <button
                  className="primary"
                  onClick={() => {
                    const el = document.getElementById("ecosystem");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  type="button"
                  aria-label="Explore 3D Healthcare Ecosystem"
                >
                  Explore 3D Ecosystem <span>↓</span>
                </button>
                <button
                  className="outline"
                  onClick={() => navigate("/app")}
                  type="button"
                  aria-label="Launch Patient Portal"
                >
                  Launch Patient Portal <span>→</span>
                </button>
                <button
                  className="outline"
                  onClick={() => navigate("/wellness")}
                  type="button"
                  aria-label="Open Wellness Hub"
                >
                  Open Wellness Hub <span>→</span>
                </button>
              </div>

              <div className="trust-points-modern">
                <div className="trust-point-item">
                  <span className="trust-point-icon">⚙</span>
                  <div>
                    <b>AI-Powered</b>
                    <span>Support</span>
                  </div>
                </div>
                <div className="trust-point-item">
                  <span className="trust-point-icon">♢</span>
                  <div>
                    <b>Verified</b>
                    <span>Clinicians</span>
                  </div>
                </div>
                <div className="trust-point-item">
                  <span className="trust-point-icon">♙</span>
                  <div>
                    <b>Privacy-First</b>
                    <span>Architecture</span>
                  </div>
                </div>
                <div className="trust-point-item">
                  <span className="trust-point-icon">♧</span>
                  <div>
                    <b>Consent-Aware</b>
                    <span>Protection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Three.js Interactive Hero Ecosystem */}
            <div className="hero-visual-modern">
              <div className="hero-canvas-frame">
                <CanvasContainer
                  cameraPosition={[0, 0, 7.6]}
                  fov={44}
                  ariaLabel="MANVIA Care Intelligence Core and Healthcare Ecosystem 3D Scene"
                >
                  <HeroEcosystemScene />
                </CanvasContainer>

                <div className="hero-bubble-modern">
                  Healthier Happier Together <span>♥</span>
                </div>

                <div className="hero-core-label">
                  <span className="hero-core-dot" />
                  <span>Care Intelligence Core</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. CONNECTED HEALTHCARE ECOSYSTEM ──────────────── */}
        <EcosystemSection />

        {/* ── 3. AI COMPANION ────────────────────────────────── */}
        <AICompanionSection />

        {/* ── 4. CORE CAPABILITIES ───────────────────────────── */}
        <CapabilitiesSection />

        {/* ── 5. CARE JOURNEY (DISCOVER → IMPROVE) ───────────── */}
        <CareJourneySection />

        {/* ── 6. COMPREHENSIVE SERVICES ──────────────────────── */}
        <ServicesSection />

        {/* ── 7. TRUST & SECURITY ────────────────────────────── */}
        <TrustSection />

        {/* ── 8. FINAL CALL TO ACTION ────────────────────────── */}
        <FinalCTASection />
      </main>

      {/* ── ENTERPRISE MEGA FOOTER ──────────────────────────── */}
      <EnterpriseMegaFooter />
    </div>
  );
};

export default LandingRoute;
