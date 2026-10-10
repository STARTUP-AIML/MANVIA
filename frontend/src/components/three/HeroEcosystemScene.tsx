import React, { useState, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ManviaCore } from "./ManviaCore";
import { HealthcareNode } from "./HealthcareNode";
import { ConnectionLine } from "./ConnectionLine";
import { ParticleField } from "./ParticleField";
import { ECOSYSTEM_NODES } from "./constants";

interface HeroEcosystemSceneProps {
  reducedMotion?: boolean;
}

/**
 * Hero 3D Ecosystem Scene.
 * Implements the progressive reveal sequence:
 * 1. Background appears
 * 2. Particles appear
 * 3. Central MANVIA core forms
 * 4. Connection lines appear
 * 5. Healthcare nodes appear
 * With gentle orbital movement, subtle camera dampening, and mouse parallax.
 */
export const HeroEcosystemScene: React.FC<HeroEcosystemSceneProps> = ({
  reducedMotion = false,
}) => {
  // Reveal stage:
  // 0: Initial
  // 1: Particles
  // 2: Core
  // 3: Connection lines
  // 4: Nodes complete
  const [revealStage, setRevealStage] = useState(reducedMotion ? 4 : 0);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const coreScaleRef = useRef(0);
  const nodesScaleRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      setRevealStage(4);
      return;
    }

    const t1 = setTimeout(() => setRevealStage(1), 150); // Particles
    const t2 = setTimeout(() => setRevealStage(2), 450); // Central Core
    const t3 = setTimeout(() => setRevealStage(3), 850); // Connection Lines
    const t4 = setTimeout(() => setRevealStage(4), 1250); // Healthcare Nodes

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const { pointer } = state;

    // Smooth progressive scale transitions
    const targetCoreScale = revealStage >= 2 ? 1 : 0;
    coreScaleRef.current = THREE.MathUtils.damp(
      coreScaleRef.current,
      targetCoreScale,
      3.5,
      delta,
    );

    const targetNodesScale = revealStage >= 4 ? 1 : 0;
    nodesScaleRef.current = THREE.MathUtils.damp(
      nodesScaleRef.current,
      targetNodesScale,
      4.0,
      delta,
    );

    if (!sceneGroupRef.current || reducedMotion) return;

    // Gentle camera parallax & natural respiratory drift
    const t = state.clock.getElapsedTime();
    const targetRotX = pointer.y * 0.12 + Math.sin(t * 0.3) * 0.02;
    const targetRotY = pointer.x * 0.18 + Math.cos(t * 0.25) * 0.03;

    sceneGroupRef.current.rotation.x = THREE.MathUtils.damp(
      sceneGroupRef.current.rotation.x,
      targetRotX,
      2.0,
      delta,
    );
    sceneGroupRef.current.rotation.y = THREE.MathUtils.damp(
      sceneGroupRef.current.rotation.y,
      targetRotY,
      2.0,
      delta,
    );
  });

  return (
    <group ref={sceneGroupRef}>
      {/* 1. Ambient Particle Field (reveals in stage 1) */}
      {revealStage >= 1 && (
        <ParticleField count={95} radius={6.2} reducedMotion={reducedMotion} />
      )}

      {/* 2. Central MANVIA Intelligence Core (reveals in stage 2) */}
      <group scale={coreScaleRef.current}>
        <ManviaCore
          scale={1.15}
          reducedMotion={reducedMotion}
          highlight={Boolean(hoveredNodeId)}
        />
      </group>

      {/* 3. Connecting Lines (reveals in stage 3) */}
      {revealStage >= 3 &&
        ECOSYSTEM_NODES.map((node) => (
          <ConnectionLine
            key={`hero-line-${node.id}`}
            start={[0, 0, 0]}
            end={node.position}
            isHighlighted={hoveredNodeId === node.id}
            color={node.color}
            glowColor={node.glowColor}
            reducedMotion={reducedMotion}
          />
        ))}

      {/* 4. Healthcare Nodes (reveals in stage 4) */}
      <group scale={nodesScaleRef.current}>
        {ECOSYSTEM_NODES.map((node) => (
          <HealthcareNode
            key={`hero-node-${node.id}`}
            data={node}
            isHovered={hoveredNodeId === node.id}
            isDeemphasized={Boolean(hoveredNodeId && hoveredNodeId !== node.id)}
            onHover={setHoveredNodeId}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>
    </group>
  );
};
