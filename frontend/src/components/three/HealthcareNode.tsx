import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface HealthcareNodeData {
  id: string;
  label: string;
  category: string;
  icon: string;
  description: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  route?: string;
  stats?: string;
}

interface HealthcareNodeProps {
  data: HealthcareNodeData;
  isHovered?: boolean;
  isDeemphasized?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  reducedMotion?: boolean;
}

/**
 * Creates a crisp billboard canvas texture for the node badge.
 * Styled with Figtree typography and MANVIA healthcare teal accents.
 */
function createNodeBadgeTexture(
  label: string,
  icon: string,
  isActive: boolean,
  glowColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Pill background
    ctx.fillStyle = isActive
      ? "rgba(9, 55, 51, 0.96)"
      : "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 304, 64, 32);
    ctx.fill();

    // Border glow
    ctx.lineWidth = isActive ? 3.5 : 2;
    ctx.strokeStyle = isActive ? glowColor : "rgba(204, 235, 232, 0.95)";
    ctx.stroke();

    // Typography
    ctx.font = "bold 23px 'Figtree', 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = isActive ? "#ffffff" : "#0E7C73";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${icon}  ${label}`, 160, 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const HealthcareNode: React.FC<HealthcareNodeProps> = ({
  data,
  isHovered = false,
  isDeemphasized = false,
  onHover,
  onClick,
  reducedMotion = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [internalHover, setInternalHover] = useState(false);

  const active = isHovered || internalHover;

  const badgeTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createNodeBadgeTexture(
      data.label,
      data.icon,
      active,
      data.glowColor,
    );
  }, [data.label, data.icon, active, data.glowColor]);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    // Gentle float on local Y axis
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      const offset = (data.position[0] + data.position[1]) * 0.5;
      meshRef.current.position.y =
        data.position[1] + Math.sin(t * 1.3 + offset) * 0.06;

      // Smooth scale interpolation when hovered
      const targetScale = active ? 1.25 : isDeemphasized ? 0.9 : 1.0;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 6,
      );
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (active ? 0.6 : 0.2);
    }
  });

  const nodeOpacity = isDeemphasized ? 0.45 : active ? 1 : 0.88;
  const emissiveIntensity = active ? 1.5 : isDeemphasized ? 0.3 : 0.65;

  return (
    <group position={data.position}>
      {/* Interactive 3D Sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(data.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setInternalHover(true);
          onHover?.(data.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setInternalHover(false);
          onHover?.(null);
        }}
      >
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial
          color={active ? data.glowColor : data.color}
          emissive={active ? data.glowColor : data.color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.15}
          transparent
          opacity={nodeOpacity}
        />

        {/* Ambient Ring */}
        <mesh ref={ringRef}>
          <ringGeometry args={[0.34, 0.38, 32]} />
          <meshBasicMaterial
            color={data.glowColor}
            transparent
            opacity={active ? 0.9 : isDeemphasized ? 0.2 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      </mesh>

      {/* Billboard Sprite Badge */}
      {badgeTexture && (
        <sprite
          position={[0, 0.46, 0]}
          scale={active ? [1.32, 0.33, 1] : isDeemphasized ? [1.05, 0.26, 1] : [1.18, 0.29, 1]}
        >
          <spriteMaterial
            map={badgeTexture}
            depthTest={false}
            transparent
            opacity={isDeemphasized ? 0.5 : 1}
          />
        </sprite>
      )}
    </group>
  );
};
