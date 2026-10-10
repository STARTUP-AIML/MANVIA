import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ManviaCoreProps {
  scale?: number;
  reducedMotion?: boolean;
  highlight?: boolean;
}

/**
 * MANVIA "Care Intelligence Core"
 * Represents the central intelligence layer connecting:
 * Patients, Doctors, Hospitals, Diagnostics, Pharmacies, and AI.
 * Medical aesthetic: luminous sapphire & cyan core with gentle breathing pulses.
 */
export const ManviaCore: React.FC<ManviaCoreProps> = ({
  scale = 1,
  reducedMotion = false,
  highlight = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const innerShellRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    const t = state.clock.getElapsedTime();

    // Gentle, slow axial precession (calm & organic)
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.04;
    }

    // Gentle organic breathing pulse
    if (nucleusRef.current) {
      const pulse = 1 + Math.sin(t * 1.2) * 0.04;
      nucleusRef.current.scale.set(pulse, pulse, pulse);
    }

    // Counter-rotating outer geometric lattice
    if (innerShellRef.current) {
      innerShellRef.current.rotation.y -= delta * 0.16;
      innerShellRef.current.rotation.z += delta * 0.08;
    }

    // Orbital rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x += delta * 0.12;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y += delta * 0.09;
    }
  });

  const coreColor = highlight ? "#14B8A6" : "#0E7C73";
  const glowColor = highlight ? "#5EEAD4" : "#2DD4BF";
  const wireColor = "#0D9488";

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* 1. Innermost Luminous Nucleus (Healthcare Teal) */}
      <mesh ref={nucleusRef}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={glowColor}
          emissiveIntensity={highlight ? 1.5 : 1.1}
          roughness={0.25}
          metalness={0.1}
          transparent
          opacity={0.94}
        />
      </mesh>

      {/* 2. Concentric Wireframe Shell (Icosahedron) */}
      <mesh ref={innerShellRef}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color={wireColor}
          emissive="#0F766E"
          emissiveIntensity={0.5}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* 3. Outer Translucent Care Shield */}
      <mesh>
        <sphereGeometry args={[1.2, 24, 24]} />
        <meshStandardMaterial
          color="#2DD4BF"
          emissive="#0D9488"
          emissiveIntensity={0.2}
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={0.14}
        />
      </mesh>

      {/* 4. Orbital Intelligence Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
        <ringGeometry args={[1.4, 1.44, 64]} />
        <meshBasicMaterial
          color="#2DD4BF"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[-Math.PI / 3, Math.PI / 6, 0]}>
        <ringGeometry args={[1.65, 1.69, 64]} />
        <meshBasicMaterial
          color="#0E7C73"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ring3Ref} rotation={[Math.PI / 6, -Math.PI / 4, 0]}>
        <ringGeometry args={[1.9, 1.93, 64]} />
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
