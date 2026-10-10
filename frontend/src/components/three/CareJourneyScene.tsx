import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CanvasContainer } from "./CanvasContainer";
import { useReducedMotion } from "./useReducedMotion";
import { JOURNEY_STEPS } from "./constants";

interface JourneyPath3DProps {
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  reducedMotion?: boolean;
}

function createJourneyMilestoneTexture(
  title: string,
  isActive: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = isActive
      ? "rgba(9, 55, 51, 0.96)"
      : "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 224, 48, 24);
    ctx.fill();

    ctx.lineWidth = isActive ? 3 : 1.5;
    ctx.strokeStyle = isActive ? "#2DD4BF" : "rgba(204, 235, 232, 0.9)";
    ctx.stroke();

    ctx.font = "bold 21px 'Figtree', 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isActive ? "#ffffff" : "#0E7C73";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, 120, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const JourneyMilestoneItem: React.FC<{
  step: (typeof JOURNEY_STEPS)[0];
  idx: number;
  isActive: boolean;
  onSelect: () => void;
}> = ({ step, idx, isActive, onSelect }) => {
  const badgeTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createJourneyMilestoneTexture(step.title, isActive);
  }, [step.title, isActive]);

  return (
    <group position={step.position}>
      {/* 3D Milestone Node (Organic Healthcare Teal) */}
      <mesh
        onClick={onSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[isActive ? 0.3 : 0.22, 24, 24]} />
        <meshStandardMaterial
          color={isActive ? "#0E7C73" : "#0D9488"}
          emissive={isActive ? "#2DD4BF" : "#0E7C73"}
          emissiveIntensity={isActive ? 1.4 : 0.5}
          roughness={0.25}
        />
      </mesh>

      {/* Glowing Milestone Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[isActive ? 0.4 : 0.3, isActive ? 0.46 : 0.34, 32]}
        />
        <meshBasicMaterial
          color={isActive ? "#5EEAD4" : "#2DD4BF"}
          transparent
          opacity={isActive ? 0.9 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Billboard Sprite Badge */}
      {badgeTexture && (
        <sprite
          position={[0, idx % 2 === 0 ? -0.58 : 0.58, 0]}
          scale={isActive ? [1.25, 0.33, 1] : [1.1, 0.29, 1]}
        >
          <spriteMaterial map={badgeTexture} depthTest={false} transparent />
        </sprite>
      )}
    </group>
  );
};

const JourneyPath3D: React.FC<JourneyPath3DProps> = ({
  activeStepIndex,
  onSelectStep,
  reducedMotion = false,
}) => {
  const photonRef = useRef<THREE.Mesh>(null);

  // Generate smooth catmull-rom curve connecting all 5 steps
  const { curve, linePoints } = useMemo(() => {
    const points = JOURNEY_STEPS.map((s) => new THREE.Vector3(...s.position));
    const catmull = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.3);
    return {
      curve: catmull,
      linePoints: catmull.getPoints(80),
    };
  }, []);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  useFrame((state) => {
    if (reducedMotion || !photonRef.current) return;
    const t = (state.clock.getElapsedTime() * 0.12) % 1;
    const pt = curve.getPoint(t);
    photonRef.current.position.copy(pt);
  });

  return (
    <group>
      {/* Visual Care Continuity Track */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore - line geometry/material */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color="#14B8A6"
          transparent
          opacity={0.55}
          linewidth={2}
        />
      </line>

      {/* Traveling Care Continuity Light */}
      <mesh ref={photonRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 5 Milestones */}
      {JOURNEY_STEPS.map((step, idx) => (
        <JourneyMilestoneItem
          key={step.id}
          step={step}
          idx={idx}
          isActive={activeStepIndex === idx}
          onSelect={() => onSelectStep(idx)}
        />
      ))}
    </group>
  );
};

export const CareJourneyScene: React.FC = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
      }}
    >
      {/* 3D Visual Path */}
      <div
        style={{
          width: "100%",
          height: "300px",
          borderRadius: "24px",
          background:
            "linear-gradient(180deg, rgba(237, 249, 255, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%)",
          border: "1px solid rgba(219, 233, 247, 0.8)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CanvasContainer
          cameraPosition={[0, 0, 7.8]}
          fov={45}
          ariaLabel="Care Journey Continuity 3D Path"
        >
          <JourneyPath3D
            activeStepIndex={activeStepIndex}
            onSelectStep={setActiveStepIndex}
            reducedMotion={prefersReducedMotion}
          />
        </CanvasContainer>
      </div>

      {/* Interactive Step Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
        }}
        role="tablist"
        aria-label="Care Journey Phases"
      >
        {JOURNEY_STEPS.map((step, idx) => {
          const isSelected = activeStepIndex === idx;
          return (
            <div
              key={step.id}
              role="tab"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => setActiveStepIndex(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveStepIndex(idx);
                }
              }}
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: isSelected
                  ? "linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)"
                  : "#ffffff",
                border: isSelected
                  ? "1.5px solid #0284c7"
                  : "1px solid #e2e8f0",
                boxShadow: isSelected
                  ? "0 8px 24px rgba(2, 132, 199, 0.14)"
                  : "0 2px 8px rgba(0, 0, 0, 0.03)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: isSelected ? "translateY(-2px)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: isSelected ? "#0284c7" : "#f1f5f9",
                    color: isSelected ? "#ffffff" : "#0284c7",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {step.icon}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    color: isSelected ? "#0284c7" : "#94a3b8",
                  }}
                >
                  PHASE 0{step.index}
                </span>
              </div>
              <h4
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#073a78",
                }}
              >
                {step.title}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: 1.45,
                }}
              >
                {step.details}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
