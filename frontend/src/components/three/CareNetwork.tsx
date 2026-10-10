import React, { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ManviaCore } from "./ManviaCore";
import { HealthcareNode } from "./HealthcareNode";
import { ConnectionLine } from "./ConnectionLine";
import { ParticleField } from "./ParticleField";
import { ECOSYSTEM_NODES } from "./constants";

interface CareNetworkProps {
  reducedMotion?: boolean;
  activeNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  scale?: number;
}

export const CareNetwork: React.FC<CareNetworkProps> = ({
  reducedMotion = false,
  activeNodeId = null,
  onSelectNode,
  scale = 1,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const networkGroupRef = useRef<THREE.Group>(null);

  const effectiveActiveId = activeNodeId ?? hoveredNodeId;

  useFrame((state, delta) => {
    if (reducedMotion || !networkGroupRef.current) return;

    // Gentle global hover and subtle mouse parallax
    const { pointer } = state;
    const targetRotX = pointer.y * 0.15;
    const targetRotY = pointer.x * 0.25;

    networkGroupRef.current.rotation.x = THREE.MathUtils.damp(
      networkGroupRef.current.rotation.x,
      targetRotX,
      2.5,
      delta,
    );
    networkGroupRef.current.rotation.y = THREE.MathUtils.damp(
      networkGroupRef.current.rotation.y,
      targetRotY,
      2.5,
      delta,
    );
  });

  const handleHover = (id: string | null) => {
    setHoveredNodeId(id);
    onSelectNode?.(id);
  };

  return (
    <group ref={networkGroupRef} scale={[scale, scale, scale]}>
      {/* Ambient Depth Particles */}
      <ParticleField count={80} radius={6.0} reducedMotion={reducedMotion} />

      {/* Central Care Intelligence Core */}
      <ManviaCore
        scale={1.1}
        reducedMotion={reducedMotion}
        highlight={Boolean(effectiveActiveId)}
      />

      {/* Connecting Dynamic Intelligence Lines */}
      {ECOSYSTEM_NODES.map((node) => (
        <ConnectionLine
          key={`line-${node.id}`}
          start={[0, 0, 0]}
          end={node.position}
          isHighlighted={effectiveActiveId === node.id}
          color={node.color}
          glowColor={node.glowColor}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Healthcare Ecosystem Nodes */}
      {ECOSYSTEM_NODES.map((node) => (
        <HealthcareNode
          key={`node-${node.id}`}
          data={node}
          isHovered={effectiveActiveId === node.id}
          isDeemphasized={Boolean(effectiveActiveId && effectiveActiveId !== node.id)}
          onHover={handleHover}
          onClick={handleHover}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
};
