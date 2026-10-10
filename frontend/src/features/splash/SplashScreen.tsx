import React, { useEffect, useRef, useState, useCallback } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  minDurationMs?: number;
  maxDurationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
}

const BRAND_COLORS = [
  "rgba(14, 124, 115, 0.85)", // MANVIA Deep Teal
  "rgba(20, 184, 166, 0.85)", // Vibrant Teal
  "rgba(52, 211, 153, 0.85)", // Mint Green
  "rgba(244, 63, 94, 0.75)",  // Soft Coral
  "rgba(245, 158, 11, 0.75)", // Warm Golden Sun
  "rgba(56, 189, 248, 0.8)",  // Sky Cyan
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 1800,
  maxDurationMs = 2400,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing your MANVIA experience...");
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleFinish = useCallback(() => {
    setIsFadingOut(true);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("manvia_splash_shown", "true");
      } catch {
        // Safe fallback if storage unavailable
      }
    }
    const timer = setTimeout(() => {
      onComplete();
    }, 450);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Keyboard accessibility: Escape or Space to skip immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

  // Pointer parallax handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion) return;
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const normX = (clientX - centerX) / centerX;
    const normY = (clientY - centerY) / centerY;
    setMouseOffset({ x: normX * 12, y: normY * 12 });
  };

  // Progress timer sequence
  useEffect(() => {
    if (prefersReducedMotion) {
      // Instant graceful transition for reduced motion users
      const timer = setTimeout(() => {
        handleFinish();
      }, 500);
      return () => clearTimeout(timer);
    }

    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct < 35) {
        setStatusMessage("Awakening Care Intelligence Core...");
      } else if (pct < 70) {
        setStatusMessage("Connecting Healthcare Ecosystem...");
      } else if (pct < 95) {
        setStatusMessage("Harmonizing Patients, Clinicians & AI...");
      } else {
        setStatusMessage("Care that feels human.");
      }

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        handleFinish();
      }
    }, 40);

    // Bounded safety timeout to ensure landing page is NEVER delayed or blocked
    const fallbackTimeout = setTimeout(() => {
      clearInterval(interval);
      handleFinish();
    }, maxDurationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimeout);
    };
  }, [handleFinish, minDurationMs, maxDurationMs, prefersReducedMotion]);

  // Interactive Particle and Orbital Canvas System
  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize 36 luminous ecosystem particles
    const particles: Particle[] = [];
    const count = window.innerWidth < 768 ? 22 : 40;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const orbitTier = (i % 3) + 1;
      const color = BRAND_COLORS[i % BRAND_COLORS.length] ?? "rgba(14, 124, 115, 0.85)";
      particles.push({
        x: width / 2 + Math.cos(angle) * (140 * orbitTier),
        y: height / 2 + Math.sin(angle) * (85 * orbitTier),
        z: (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1.8,
        color,
        alpha: Math.random() * 0.4 + 0.4,
        orbitAngle: angle,
        orbitSpeed: 0.008 / orbitTier + (Math.random() * 0.004),
        orbitRadiusX: 130 + orbitTier * 55 + (Math.random() * 20),
        orbitRadiusY: 75 + orbitTier * 35 + (Math.random() * 15),
      });
    }

    let time = 0;
    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw concentric subtle orbital paths
      const orbitalTiers = [
        { rx: 185, ry: 110, tilt: -0.22, stroke: "rgba(14, 124, 115, 0.12)" },
        { rx: 245, ry: 145, tilt: 0.18, stroke: "rgba(20, 184, 166, 0.10)" },
        { rx: 305, ry: 180, tilt: -0.08, stroke: "rgba(56, 189, 248, 0.08)" },
      ];

      orbitalTiers.forEach((tier) => {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(tier.tilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, tier.rx, tier.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = tier.stroke;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.restore();
      });

      // 2. Draw connecting dynamic filaments between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        if (!pi) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          if (!pj) continue;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            const lineAlpha = (1 - dist / 110) * 0.22;
            ctx.strokeStyle = `rgba(14, 124, 115, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 3. Update and draw particles orbiting the wellness core
      particles.forEach((p, idx) => {
        p.orbitAngle += p.orbitSpeed;
        const tilt = idx % 2 === 0 ? -0.15 : 0.12;

        const rawX = Math.cos(p.orbitAngle) * p.orbitRadiusX;
        const rawY = Math.sin(p.orbitAngle) * p.orbitRadiusY;

        // Apply 2D rotation for orbital tilt
        p.x = centerX + rawX * Math.cos(tilt) - rawY * Math.sin(tilt);
        p.y = centerY + rawX * Math.sin(tilt) + rawY * Math.cos(tilt);

        // Breathing pulse
        const pulse = 1 + Math.sin(time * 2 + idx) * 0.2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <aside
      aria-label="MANVIA Loading Screen"
      aria-live="polite"
      role="status"
      onPointerMove={handlePointerMove}
      data-testid="manvia-splash-screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fcfdfd",
        backgroundImage: `
          radial-gradient(circle at 50% 45%, rgba(240, 253, 250, 0.95) 0%, rgba(236, 253, 245, 0.75) 45%, rgba(252, 253, 253, 1) 85%)
        `,
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? "scale(1.025)" : "scale(1)",
        transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isFadingOut ? "none" : "auto",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "'Figtree', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Interactive Orbital & Particle Canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Ambient Radial Wellness Aura */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "min(680px, 90vw)",
          height: "min(680px, 90vw)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, rgba(245, 158, 11, 0.08) 45%, transparent 70%)",
          filter: "blur(32px)",
          pointerEvents: "none",
          transform: `translate(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.4}px)`,
          transition: "transform 0.2s ease-out",
        }}
      />

      {/* Main Central Card & Interactive Emblem */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "24px",
          maxWidth: "460px",
          transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
          transition: "transform 0.18s ease-out",
        }}
      >
        {/* Orbital Circular Progress Halo surrounding the Logo */}
        <div
          style={{
            position: "relative",
            width: "180px",
            height: "180px",
            marginBottom: "20px",
            display: "grid",
            placeItems: "center",
          }}
        >
          {/* Circular Segmented Progress Ring (SVG) */}
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            style={{
              position: "absolute",
              inset: 0,
              transform: "rotate(-90deg)",
              overflow: "visible",
            }}
            aria-hidden="true"
          >
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r="80"
              fill="none"
              stroke="rgba(204, 235, 232, 0.65)"
              strokeWidth="3.5"
            />
            {/* Animated Active Arc */}
            <circle
              cx="90"
              cy="90"
              r="80"
              fill="none"
              stroke="url(#splash-teal-gradient)"
              strokeWidth="4.5"
              strokeDasharray={2 * Math.PI * 80}
              strokeDashoffset={
                2 * Math.PI * 80 - (progress / 100) * (2 * Math.PI * 80)
              }
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.1s linear",
              }}
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient
                id="splash-teal-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#0E7C73" />
                <stop offset="50%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
          </svg>

          {/* Authentic MANVIA Logo Card */}
          <div
            style={{
              width: "136px",
              height: "136px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              border: "2px solid rgba(204, 235, 232, 0.9)",
              boxShadow:
                "0 16px 36px rgba(14, 124, 115, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              padding: "10px",
              boxSizing: "border-box",
            }}
          >
            <img
              src="/manvia-original-logo.jpg"
              alt="MANVIA — Care that feels human"
              data-testid="splash-logo-image"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              onError={(e) => {
                // Graceful fallback to svg favicon or emblem
                const target = e.currentTarget;
                target.src = "/manvia-logo-mark.png";
              }}
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: "2.1rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#0F2E2B",
            fontFamily: "'Bricolage Grotesque', 'Figtree', sans-serif",
          }}
        >
          MANVIA
        </h1>

        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "0.98rem",
            fontWeight: 600,
            color: "#0E7C73",
            letterSpacing: "0.02em",
          }}
        >
          Care that feels human.
        </p>

        {/* Dynamic Micro-Status Message */}
        <div
          style={{
            minHeight: "24px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(240, 253, 250, 0.9)",
            border: "1px solid rgba(204, 235, 232, 0.8)",
            padding: "5px 14px",
            borderRadius: "20px",
            fontSize: "0.82rem",
            color: "#093733",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(14, 124, 115, 0.06)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#14B8A6",
              boxShadow: "0 0 8px #14B8A6",
            }}
          />
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* Accessible Skip Button (top-right) */}
      <button
        type="button"
        onClick={handleFinish}
        aria-label="Skip splash screen and proceed to home"
        data-testid="splash-skip-button"
        style={{
          position: "absolute",
          top: "22px",
          right: "24px",
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(204, 235, 232, 0.85)",
          borderRadius: "20px",
          padding: "6px 14px",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#4B6482",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#0E7C73";
          e.currentTarget.style.borderColor = "#0E7C73";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#4B6482";
          e.currentTarget.style.borderColor = "rgba(204, 235, 232, 0.85)";
        }}
      >
        Skip <span>✕</span>
      </button>

      {/* Bottom Subtle Disclaimer */}
      <div
        style={{
          position: "absolute",
          bottom: "18px",
          fontSize: "0.75rem",
          color: "#64748b",
          letterSpacing: "0.01em",
        }}
      >
        Connected Health & Wellness Intelligence • India
      </div>
    </aside>
  );
};
