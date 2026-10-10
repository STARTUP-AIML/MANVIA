import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useWebGLSupport } from "./useWebGLSupport";
import { useReducedMotion } from "./useReducedMotion";

interface CanvasContainerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  cameraPosition?: [number, number, number];
  fov?: number;
  ariaLabel?: string;
}

/**
 * Robust Three.js Canvas Container.
 * Features:
 * 1. WebGL capability detection (prevents crashes in headless jsdom & low-end environments).
 * 2. IntersectionObserver to automatically pause canvas loop when offscreen.
 * 3. Accessibility fallback when WebGL or reduced-motion is active.
 * 4. Controlled DPR ([1, 1.5]) and minimal GPU power overhead.
 */
export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  children,
  fallback,
  className = "",
  style = {},
  cameraPosition = [0, 0, 7.5],
  fov = 45,
  ariaLabel = "3D Interactive Healthcare Network",
}) => {
  const isWebGLAvailable = useWebGLSupport();
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // IntersectionObserver to pause R3F render loop when offscreen
  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Graceful fallback for non-WebGL environments (e.g. jsdom unit tests, legacy browsers)
  if (!isWebGLAvailable) {
    return (
      <div
        ref={containerRef}
        className={`canvas-container ${className}`}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          ...style,
        }}
        role="img"
        aria-label={ariaLabel}
      >
        {fallback ? (
          fallback
        ) : (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#073a78",
              background:
                "radial-gradient(circle at center, #edf9ff 0%, #e0f2fe 60%, transparent 100%)",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                fontSize: "32px",
                boxShadow: "0 10px 30px rgba(14, 165, 233, 0.3)",
                marginBottom: "12px",
              }}
            >
              ✦
            </div>
            <strong style={{ fontSize: "16px", color: "#073a78" }}>
              MANVIA Care Intelligence
            </strong>
            <span
              style={{ fontSize: "12px", color: "#5d7696", marginTop: "4px" }}
            >
              Connected healthcare network
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "320px",
        overflow: "hidden",
        ...style,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: cameraPosition, fov }}
          dpr={[1, 1.5]}
          frameloop={prefersReducedMotion ? "demand" : isVisible ? "always" : "never"}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.1} />
          <pointLight
            position={[0, 0, 1]}
            intensity={1.4}
            color="#38bdf8"
            distance={8}
          />
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
};
