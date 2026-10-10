import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CanvasContainer } from "./CanvasContainer";
import { useReducedMotion } from "./useReducedMotion";

const ShieldLattice3D: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  const shieldGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();

    if (shieldGroupRef.current) {
      shieldGroupRef.current.rotation.y += delta * 0.12;
      shieldGroupRef.current.rotation.x = Math.sin(t * 0.3) * 0.04;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.16;
    }

    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.035;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={shieldGroupRef}>
      {/* Central Geometric Core (Teal Lattice) */}
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial
          color="#0D9488"
          emissive="#14B8A6"
          emissiveIntensity={0.65}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Inner Solid Nucleus */}
      <mesh>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial
          color="#0E7C73"
          emissive="#2DD4BF"
          emissiveIntensity={1.1}
          roughness={0.25}
        />
      </mesh>

      {/* Rotating Security Aura Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[1.3, 1.35, 48]} />
        <meshBasicMaterial
          color="#2DD4BF"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 5 Security Nodes (Privacy, Consent, Security, Auditability, Human Oversight) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.cos(angle) * 1.35;
        const y = Math.sin(angle) * 1.35;
        return (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial
              color="#2DD4BF"
              emissive="#5EEAD4"
              emissiveIntensity={1.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const TrustShieldScene: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      style={{
        width: "100%",
        height: "260px",
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
      }}
    >
      <CanvasContainer
        cameraPosition={[0, 0, 4.2]}
        fov={45}
        ariaLabel="Cryptographic and Trust Network Visualization"
        fallback={
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#38bdf8",
              fontSize: "40px",
            }}
          >
            🛡
          </div>
        }
      >
        <ShieldLattice3D reducedMotion={prefersReducedMotion} />
      </CanvasContainer>
    </div>
  );
};
