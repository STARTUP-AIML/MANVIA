import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isHighlighted?: boolean;
  color?: string;
  glowColor?: string;
  reducedMotion?: boolean;
}

/**
 * Animated connecting intelligence line linking MANVIA Core to an ecosystem node.
 * Features a thin glowing spline and an animated data photon pulse.
 */
export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  start,
  end,
  isHighlighted = false,
  color = "#14B8A6",
  glowColor = "#2DD4BF",
  reducedMotion = false,
}) => {
  const photonRef = useRef<THREE.Mesh>(null);

  // Generate a gentle curved 3-point quadratic bezier between start and end
  const { curve, linePoints } = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    // Midpoint with subtle perpendicular arch
    const vMid = new THREE.Vector3()
      .addVectors(vStart, vEnd)
      .multiplyScalar(0.5);
    vMid.y += 0.2;

    const bezier = new THREE.QuadraticBezierCurve3(vStart, vMid, vEnd);
    return {
      curve: bezier,
      linePoints: bezier.getPoints(24),
    };
  }, [start, end]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  useFrame((state) => {
    if (reducedMotion || !photonRef.current) return;

    // Gentle, calm care flow speed
    const t = (state.clock.getElapsedTime() * (isHighlighted ? 0.6 : 0.25)) % 1;
    const point = curve.getPoint(t);
    photonRef.current.position.copy(point);
  });

  return (
    <group>
      {/* Subtle Glowing Connecting Line */}
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore - line with geometry and material in R3F */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial
          color={isHighlighted ? glowColor : color}
          transparent
          opacity={isHighlighted ? 0.8 : 0.25}
          linewidth={isHighlighted ? 2 : 1}
        />
      </line>

      {/* Traveling Data Pulse Photon */}
      <mesh ref={photonRef}>
        <sphereGeometry args={[isHighlighted ? 0.048 : 0.032, 12, 12]} />
        <meshBasicMaterial
          color={isHighlighted ? "#ffffff" : glowColor}
          transparent
          opacity={isHighlighted ? 0.95 : 0.65}
        />
      </mesh>
    </group>
  );
};
