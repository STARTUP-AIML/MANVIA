import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
  radius?: number;
  color?: string;
  reducedMotion?: boolean;
}

/**
 * Floating particle field providing subtle ambient depth.
 * Keeps particle count modest (80-120) for optimal 60fps performance.
 */
export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 55,
  radius = 6.2,
  color = "#2DD4BF",
  reducedMotion = false,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const scl = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a spherical volume
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(Math.random()) * radius;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      scl[i] = Math.random() * 0.04 + 0.02;
    }

    return [pos, scl];
  }, [count, radius]);

  useFrame((state, delta) => {
    if (reducedMotion || !pointsRef.current) return;
    const t = state.clock.getElapsedTime();

    // Subtle ambient rotation
    pointsRef.current.rotation.y += delta * 0.025;
    pointsRef.current.rotation.x = Math.sin(t * 0.08) * 0.02;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("scale", new THREE.BufferAttribute(scales, 1));
    return geo;
  }, [positions, scales]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.048}
        sizeAttenuation
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
