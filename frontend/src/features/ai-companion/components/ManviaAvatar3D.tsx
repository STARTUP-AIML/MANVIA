/**
 * MANVIA 3D Interactive Human-Like AI Healthcare Companion Avatar
 *
 * Implements Phase 5.1 requirements:
 * - Professional female-presenting virtual healthcare companion inspired by visual reference
 * - Realistic stylized 3D facial proportions, warm skin tones, and soft studio lighting
 * - Voluminous dark brown wavy hair, charcoal-gray blazer, and muted peach blouse
 * - Dynamic viseme-driven mouth animation synchronized with SpeechSynthesis playback
 * - Natural eyelid blinking, expressive eyebrows, head movements, and breathing
 * - Distinct interaction states: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
 * - High-fidelity fallback card with reference portrait for non-WebGL environments
 * - Responsive desktop/mobile presentation and reduced-motion compliance
 */

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CanvasContainer } from "@/components/three/CanvasContainer";
import { useWebGLSupport } from "@/components/three/useWebGLSupport";
import { useReducedMotion } from "@/components/three/useReducedMotion";
import type { SpeechVisemeState } from "../hooks/useSpeechSynthesis";

export type AvatarCompanionState = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface ManviaAvatar3DProps {
  state?: AvatarCompanionState;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isVoicePlaying?: boolean;
  onStopVoice?: () => void;
  visemeState?: SpeechVisemeState;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 3D Human-Like Companion Scene
 */
const HumanAvatar3DScene: React.FC<{
  avatarState: AvatarCompanionState;
  isVoicePlaying: boolean;
  visemeState?: SpeechVisemeState;
  reducedMotion: boolean;
}> = ({ avatarState, isVoicePlaying, visemeState, reducedMotion }) => {
  // Skeleton / Joint Hierarchy
  const rootGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const neckGroupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);

  // Eyes and Eyelids
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftEyelidUpperRef = useRef<THREE.Mesh>(null);
  const rightEyelidUpperRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);

  // Mouth Rigging
  const jawGroupRef = useRef<THREE.Group>(null);
  const upperLipRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const mouthCavityRef = useRef<THREE.Mesh>(null);
  const teethUpperRef = useRef<THREE.Mesh>(null);
  const teethLowerRef = useRef<THREE.Mesh>(null);

  // Hair Layers
  const hairLeftLockRef = useRef<THREE.Group>(null);
  const hairRightLockRef = useRef<THREE.Group>(null);

  // Blinking State
  const nextBlinkRef = useRef<number>(2.5);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkStartRef = useRef<number>(0);

  // Interpolated Mouth Visemes
  const currentOpennessRef = useRef<number>(0);
  const currentRoundnessRef = useRef<number>(0);
  const currentSmileRef = useRef<number>(0.25);

  // Head Orientation Targets
  const targetRotXRef = useRef<number>(0);
  const targetRotYRef = useRef<number>(0);
  const targetRotZRef = useRef<number>(0);

  // Colors based on state
  const statusLightColor = useMemo(() => {
    switch (avatarState) {
      case "listening":
        return "#38bdf8"; // Radiant azure cyan
      case "thinking":
        return "#818cf8"; // Pensive indigo violet
      case "speaking":
        return "#34d399"; // Warm healthcare emerald
      case "error":
        return "#fbbf24"; // Soft warm amber
      case "idle":
      default:
        return "#0ea5e9"; // Calm clinical blue
    }
  }, [avatarState]);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    const t = state.clock.getElapsedTime();

    // 1. Natural Breathing (Chest & Upper Torso rise/fall)
    if (rootGroupRef.current) {
      const breath = Math.sin(t * 1.5) * 0.015;
      rootGroupRef.current.position.y = -0.15 + breath;
    }

    if (torsoGroupRef.current) {
      const chestExpansion = 1 + Math.sin(t * 1.5) * 0.01;
      torsoGroupRef.current.scale.set(chestExpansion, 1, chestExpansion);
    }

    // 2. Natural Eyelid Blinking (120ms every 3.5 - 5.5 seconds)
    if (!isBlinkingRef.current && t > nextBlinkRef.current) {
      isBlinkingRef.current = true;
      blinkStartRef.current = t;
    }

    if (isBlinkingRef.current) {
      const elapsedBlink = t - blinkStartRef.current;
      const blinkDuration = 0.14;
      if (elapsedBlink < blinkDuration) {
        const blinkProgress = Math.sin((elapsedBlink / blinkDuration) * Math.PI);
        const lidY = THREE.MathUtils.lerp(0.045, -0.01, blinkProgress);
        if (leftEyelidUpperRef.current) leftEyelidUpperRef.current.position.y = lidY;
        if (rightEyelidUpperRef.current) rightEyelidUpperRef.current.position.y = lidY;
      } else {
        isBlinkingRef.current = false;
        if (leftEyelidUpperRef.current) leftEyelidUpperRef.current.position.y = 0.045;
        if (rightEyelidUpperRef.current) rightEyelidUpperRef.current.position.y = 0.045;
        nextBlinkRef.current = t + 3.2 + Math.random() * 2.8;
      }
    }

    // 3. Eyebrow Expressiveness
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      if (avatarState === "listening") {
        // Attentive lift
        leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          leftEyebrowRef.current.position.y,
          0.13,
          delta * 4,
        );
        rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          rightEyebrowRef.current.position.y,
          0.13,
          delta * 4,
        );
      } else if (avatarState === "thinking") {
        // Pensive subtle knit
        leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          leftEyebrowRef.current.position.y,
          0.105,
          delta * 4,
        );
        rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          rightEyebrowRef.current.position.y,
          0.105,
          delta * 4,
        );
      } else {
        // Friendly resting arch
        leftEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          leftEyebrowRef.current.position.y,
          0.118,
          delta * 4,
        );
        rightEyebrowRef.current.position.y = THREE.MathUtils.lerp(
          rightEyebrowRef.current.position.y,
          0.118,
          delta * 4,
        );
      }
    }

    // 4. Head Posture and Conversational Gestures
    if (headGroupRef.current) {
      if (avatarState === "listening") {
        targetRotXRef.current = 0.06;
        targetRotYRef.current = Math.sin(t * 1.0) * 0.03;
        targetRotZRef.current = 0.035; // Attentive listening tilt
      } else if (avatarState === "thinking") {
        targetRotXRef.current = -0.05 + Math.sin(t * 1.4) * 0.02;
        targetRotYRef.current = 0.06 + Math.cos(t * 0.9) * 0.03;
        targetRotZRef.current = -0.03;
      } else if (avatarState === "speaking" || isVoicePlaying) {
        // Rhythmic speech cadence nodding
        const nod = Math.sin(t * 5.2) * 0.028 + Math.sin(t * 2.6) * 0.015;
        const turn = Math.sin(t * 1.8) * 0.035;
        targetRotXRef.current = nod;
        targetRotYRef.current = turn;
        targetRotZRef.current = 0;
      } else {
        // Idle gentle subtle drift
        targetRotXRef.current = Math.sin(t * 0.6) * 0.015;
        targetRotYRef.current = Math.sin(t * 0.4) * 0.025;
        targetRotZRef.current = Math.cos(t * 0.5) * 0.01;
      }

      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        targetRotXRef.current,
        delta * 5,
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        targetRotYRef.current,
        delta * 5,
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z,
        targetRotZRef.current,
        delta * 5,
      );
    }

    // 5. Hair Physics / Subtle Sway
    if (hairLeftLockRef.current && hairRightLockRef.current) {
      const hairSway = Math.sin(t * 1.4) * 0.015;
      hairLeftLockRef.current.rotation.z = hairSway;
      hairRightLockRef.current.rotation.z = -hairSway;
    }

    // 6. Synchronized Mouth Animation & Visemes
    let targetOpenness = 0;
    let targetRoundness = 0;
    let targetSmile = 0.25; // Resting friendly smile

    if (isVoicePlaying || avatarState === "speaking") {
      if (visemeState && visemeState.viseme !== "sil") {
        // Driven by real-time speech boundary events
        const syllableOscillation = Math.abs(Math.sin(t * 14.0));
        targetOpenness = THREE.MathUtils.clamp(
          visemeState.openness * (0.65 + syllableOscillation * 0.35),
          0.1,
          0.85,
        );
        targetRoundness = visemeState.roundness;
        targetSmile = visemeState.smile;
      } else {
        // Natural conversational speech cadence fallback
        const primaryWave = Math.sin(t * 13.0);
        const secondaryWave = Math.sin(t * 7.5);
        const combined = Math.max(0, primaryWave * 0.6 + secondaryWave * 0.4);
        targetOpenness = THREE.MathUtils.clamp(combined * 0.55, 0.08, 0.7);
        targetRoundness = Math.abs(Math.sin(t * 4.0)) * 0.3;
        targetSmile = 0.3 + Math.sin(t * 5.0) * 0.15;
      }
    } else {
      // Resting closed position
      targetOpenness = 0;
      targetRoundness = 0;
      targetSmile = 0.22;
    }

    // Smoothly interpolate mouth parameters
    currentOpennessRef.current = THREE.MathUtils.lerp(
      currentOpennessRef.current,
      targetOpenness,
      delta * 18,
    );
    currentRoundnessRef.current = THREE.MathUtils.lerp(
      currentRoundnessRef.current,
      targetRoundness,
      delta * 14,
    );
    currentSmileRef.current = THREE.MathUtils.lerp(
      currentSmileRef.current,
      targetSmile,
      delta * 10,
    );

    const openness = currentOpennessRef.current;
    const roundness = currentRoundnessRef.current;
    const smile = currentSmileRef.current;

    // Apply to Jaw & Lower Lip
    if (jawGroupRef.current) {
      jawGroupRef.current.position.y = -openness * 0.038;
      jawGroupRef.current.rotation.x = openness * 0.08;
    }

    if (lowerLipRef.current) {
      lowerLipRef.current.position.y = -0.175 - openness * 0.025;
      const lipScaleX = 1 + (smile - 0.25) * 0.2 - roundness * 0.25;
      const lipScaleY = 1 + openness * 0.3;
      lowerLipRef.current.scale.set(lipScaleX, lipScaleY, 1);
    }

    if (upperLipRef.current) {
      upperLipRef.current.position.y = -0.155 + openness * 0.008;
      const lipScaleX = 1 + (smile - 0.25) * 0.18 - roundness * 0.25;
      upperLipRef.current.scale.set(lipScaleX, 1, 1);
    }

    if (mouthCavityRef.current) {
      mouthCavityRef.current.scale.set(
        1 - roundness * 0.2 + smile * 0.15,
        Math.max(0.05, openness * 1.2),
        1,
      );
      mouthCavityRef.current.visible = openness > 0.04;
    }

    if (teethUpperRef.current && teethLowerRef.current) {
      teethUpperRef.current.visible = openness > 0.08;
      teethLowerRef.current.visible = openness > 0.22;
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, -0.15, 0]}>
      {/* 3-Point Daylight Clinic Lighting Setup */}
      <ambientLight intensity={1.1} color="#f8fafc" />

      {/* 1. Key Light: Warm Soft Daylight from window (front-left) */}
      <directionalLight
        position={[2.0, 3.0, 2.5]}
        intensity={1.8}
        color="#fffbf0"
      />

      {/* 2. Fill Light: Soft Cool Sky Fill from front-right */}
      <directionalLight
        position={[-2.0, 2.0, 2.0]}
        intensity={1.1}
        color="#e0f2fe"
      />

      {/* 3. Rim / Hair Light: Subtle Silhouette Light from rear */}
      <pointLight
        position={[0, 2.2, -1.8]}
        intensity={1.4}
        color="#fef3c7"
        distance={6}
      />

      {/* Dynamic Status Aura Light in healthcare setting */}
      <pointLight
        position={[0, 0.3, 1.6]}
        intensity={0.5}
        color={statusLightColor}
        distance={4}
      />

      {/* Soft Daylight Healthcare Clinic Background */}
      <mesh position={[0, 0.4, -1.8]}>
        <planeGeometry args={[6.5, 4.5]} />
        <meshStandardMaterial
          color="#f1f5f9"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      {/* Subtle Warm Window Blind Slats / Clinic Depth */}
      <mesh position={[0, 0.6, -1.75]}>
        <planeGeometry args={[5.8, 3.6]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#ccfbf1"
          emissiveIntensity={0.15}
          roughness={0.85}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* ============================================================== */}
      {/* TORSO & PROFESSIONAL HEALTHCARE WARDROBE (White Uniform & Teal Trim) */}
      {/* ============================================================== */}
      <group ref={torsoGroupRef} position={[0, -0.5, 0]}>
        {/* White Professional Healthcare Uniform Coat Body */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.96, 0.68, 0.44]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.7}
            metalness={0.02}
          />
        </mesh>

        {/* Left Structured Shoulder */}
        <mesh position={[-0.46, 0.05, 0]}>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </mesh>

        {/* Right Structured Shoulder */}
        <mesh position={[0.46, 0.05, 0]}>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </mesh>

        {/* Left Uniform Sleeve */}
        <mesh position={[-0.48, -0.25, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.13, 0.11, 0.58, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>

        {/* Right Uniform Sleeve */}
        <mesh position={[0.48, -0.25, 0]} rotation={[0, 0, -0.12]}>
          <cylinderGeometry args={[0.13, 0.11, 0.58, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>

        {/* Left Teal Accent Notched Lapel */}
        <mesh position={[-0.14, -0.06, 0.22]} rotation={[0, -0.1, -0.2]}>
          <boxGeometry args={[0.14, 0.42, 0.04]} />
          <meshStandardMaterial color="#0d9488" roughness={0.45} />
        </mesh>

        {/* Right Teal Accent Notched Lapel */}
        <mesh position={[0.14, -0.06, 0.22]} rotation={[0, 0.1, 0.2]}>
          <boxGeometry args={[0.14, 0.42, 0.04]} />
          <meshStandardMaterial color="#0d9488" roughness={0.45} />
        </mesh>

        {/* Soft Teal / Cyan Scrub Top Underlayer */}
        <mesh position={[0, -0.05, 0.19]}>
          <boxGeometry args={[0.28, 0.38, 0.04]} />
          <meshStandardMaterial
            color="#ccfbf1"
            roughness={0.6}
            metalness={0.02}
          />
        </mesh>

        {/* Scrub Left Collar Trim */}
        <mesh position={[-0.09, 0.12, 0.21]} rotation={[0, 0, 0.35]}>
          <boxGeometry args={[0.08, 0.16, 0.02]} />
          <meshStandardMaterial color="#0f766e" roughness={0.5} />
        </mesh>

        {/* Scrub Right Collar Trim */}
        <mesh position={[0.09, 0.12, 0.21]} rotation={[0, 0, -0.35]}>
          <boxGeometry args={[0.08, 0.16, 0.02]} />
          <meshStandardMaterial color="#0f766e" roughness={0.5} />
        </mesh>

        {/* Uniform Center Button Placket & Teal Buttons */}
        <mesh position={[0, -0.08, 0.212]}>
          <boxGeometry args={[0.035, 0.32, 0.01]} />
          <meshStandardMaterial color="#0d9488" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0.22]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color="#0f766e" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.08, 0.22]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color="#0f766e" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.18, 0.22]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color="#0f766e" roughness={0.4} />
        </mesh>

        {/* MANVIA Healthcare Emblem on Left Chest */}
        <mesh position={[-0.24, -0.05, 0.225]}>
          <boxGeometry args={[0.065, 0.035, 0.01]} />
          <meshStandardMaterial
            color="#0f766e"
            emissive="#0d9488"
            emissiveIntensity={0.2}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* NECK & COLLARBONE */}
      {/* ============================================================== */}
      <group ref={neckGroupRef} position={[0, -0.22, 0.04]}>
        <mesh>
          <cylinderGeometry args={[0.135, 0.16, 0.26, 24]} />
          <meshStandardMaterial
            color="#f2d1bd"
            roughness={0.45}
            metalness={0.02}
          />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* HEAD, FACE, HAIR & FACIAL RIG */}
      {/* ============================================================== */}
      <group ref={headGroupRef} position={[0, 0.22, 0.06]}>
        {/* Main Cranium / Face Base (Sculpted Stylized Female Proportions) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.39, 32, 32]} />
          <meshStandardMaterial
            color="#f2d1bd"
            roughness={0.45}
            metalness={0.02}
          />
        </mesh>

        {/* Feminine Chin and Soft Jaw Contour */}
        <mesh position={[0, -0.23, 0.16]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.22, 0.32, 24]} />
          <meshStandardMaterial
            color="#edd0bd"
            roughness={0.45}
            metalness={0.02}
          />
        </mesh>

        {/* Soft Cheek Blush Contours */}
        <mesh position={[-0.18, -0.04, 0.31]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color="#e39f93"
            roughness={0.6}
            transparent
            opacity={0.35}
          />
        </mesh>
        <mesh position={[0.18, -0.04, 0.31]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color="#e39f93"
            roughness={0.6}
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Refined Slender Nose Bridge & Tip */}
        <mesh position={[0, -0.02, 0.36]} rotation={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.042, 0.18, 16]} />
          <meshStandardMaterial color="#f0ceba" roughness={0.42} />
        </mesh>
        <mesh position={[0, -0.09, 0.38]}>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshStandardMaterial color="#eecbbe" roughness={0.4} />
        </mesh>

        {/* Ears */}
        <mesh position={[-0.38, 0, 0]} rotation={[0, 0.2, -0.1]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#eed0bc" roughness={0.5} />
        </mesh>
        <mesh position={[0.38, 0, 0]} rotation={[0, -0.2, 0.1]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#eed0bc" roughness={0.5} />
        </mesh>

        {/* Pearl Stud Earrings */}
        <mesh position={[-0.39, -0.06, 0.02]}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.15}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[0.39, -0.06, 0.02]}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.15}
            metalness={0.3}
          />
        </mesh>

        {/* ============================================================== */}
        {/* EYES (Left & Right Almond Hazel-Brown Eyes) */}
        {/* ============================================================== */}
        {/* Left Eye Group */}
        <group ref={leftEyeRef} position={[-0.14, 0.04, 0.33]}>
          {/* Eye Sclera (White) */}
          <mesh>
            <sphereGeometry args={[0.068, 20, 20]} />
            <meshStandardMaterial color="#fafafa" roughness={0.15} />
          </mesh>
          {/* Hazel-Green Iris */}
          <mesh position={[0, 0, 0.052]}>
            <circleGeometry args={[0.036, 24]} />
            <meshStandardMaterial color="#4f6b47" roughness={0.2} />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.054]}>
            <circleGeometry args={[0.018, 20]} />
            <meshStandardMaterial color="#111111" roughness={0.1} />
          </mesh>
          {/* Specular Reflex */}
          <mesh position={[0.012, 0.014, 0.056]}>
            <circleGeometry args={[0.007, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Upper Eyelid (Blinks down) */}
          <mesh ref={leftEyelidUpperRef} position={[0, 0.045, 0.03]}>
            <boxGeometry args={[0.11, 0.05, 0.06]} />
            <meshStandardMaterial color="#edd0bd" roughness={0.45} />
          </mesh>
          {/* Natural Eyelash Line */}
          <mesh position={[0, 0.046, 0.055]} rotation={[0, 0, 0.08]}>
            <boxGeometry args={[0.1, 0.008, 0.01]} />
            <meshBasicMaterial color="#1a0f0a" />
          </mesh>
        </group>

        {/* Right Eye Group */}
        <group ref={rightEyeRef} position={[0.14, 0.04, 0.33]}>
          {/* Eye Sclera (White) */}
          <mesh>
            <sphereGeometry args={[0.068, 20, 20]} />
            <meshStandardMaterial color="#fafafa" roughness={0.15} />
          </mesh>
          {/* Hazel-Green Iris */}
          <mesh position={[0, 0, 0.052]}>
            <circleGeometry args={[0.036, 24]} />
            <meshStandardMaterial color="#4f6b47" roughness={0.2} />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0, 0.054]}>
            <circleGeometry args={[0.018, 20]} />
            <meshStandardMaterial color="#111111" roughness={0.1} />
          </mesh>
          {/* Specular Reflex */}
          <mesh position={[0.012, 0.014, 0.056]}>
            <circleGeometry args={[0.007, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Upper Eyelid (Blinks down) */}
          <mesh ref={rightEyelidUpperRef} position={[0, 0.045, 0.03]}>
            <boxGeometry args={[0.11, 0.05, 0.06]} />
            <meshStandardMaterial color="#edd0bd" roughness={0.45} />
          </mesh>
          {/* Natural Eyelash Line */}
          <mesh position={[0, 0.046, 0.055]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[0.1, 0.008, 0.01]} />
            <meshBasicMaterial color="#1a0f0a" />
          </mesh>
        </group>

        {/* ============================================================== */}
        {/* EYEBROWS (Arched Dark Brunette) */}
        {/* ============================================================== */}
        <mesh
          ref={leftEyebrowRef}
          position={[-0.15, 0.12, 0.36]}
          rotation={[0, 0, 0.12]}
        >
          <boxGeometry args={[0.12, 0.018, 0.01]} />
          <meshBasicMaterial color="#2c1a11" />
        </mesh>
        <mesh
          ref={rightEyebrowRef}
          position={[0.15, 0.12, 0.36]}
          rotation={[0, 0, -0.12]}
        >
          <boxGeometry args={[0.12, 0.018, 0.01]} />
          <meshBasicMaterial color="#2c1a11" />
        </mesh>

        {/* ============================================================== */}
        {/* MOUTH & LIP RIG (Articulated Viseme Lip-Sync) */}
        {/* ============================================================== */}
        <group position={[0, 0, 0.35]}>
          {/* Dark Oral Cavity behind lips */}
          <mesh ref={mouthCavityRef} position={[0, -0.165, -0.02]} visible={false}>
            <boxGeometry args={[0.12, 0.06, 0.04]} />
            <meshBasicMaterial color="#35151b" />
          </mesh>

          {/* Upper Teeth Row */}
          <mesh ref={teethUpperRef} position={[0, -0.152, -0.005]} visible={false}>
            <boxGeometry args={[0.088, 0.02, 0.01]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>

          {/* Lower Teeth Row */}
          <mesh ref={teethLowerRef} position={[0, -0.18, -0.005]} visible={false}>
            <boxGeometry args={[0.076, 0.018, 0.01]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>

          {/* Upper Lip (Warm Rose with Cupid's Bow) */}
          <mesh ref={upperLipRef} position={[0, -0.155, 0.01]}>
            <boxGeometry args={[0.13, 0.024, 0.025]} />
            <meshStandardMaterial
              color="#ba666e"
              roughness={0.35}
              metalness={0.05}
            />
          </mesh>

          {/* Dynamic Jaw & Lower Lip */}
          <group ref={jawGroupRef}>
            <mesh ref={lowerLipRef} position={[0, -0.176, 0.012]}>
              <boxGeometry args={[0.125, 0.026, 0.025]} />
              <meshStandardMaterial
                color="#c4737b"
                roughness={0.35}
                metalness={0.05}
              />
            </mesh>
          </group>
        </group>

        {/* ============================================================== */}
        {/* VOLUMINOUS DARK BRUNETTE WAVY HAIR (Matching Reference Image) */}
        {/* ============================================================== */}
        {/* Hair Crown Volume */}
        <mesh position={[0, 0.18, -0.05]}>
          <sphereGeometry args={[0.43, 24, 24]} />
          <meshStandardMaterial
            color="#342016"
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>

        {/* Left Side-Swept Hair Parting */}
        <mesh position={[-0.18, 0.22, 0.12]} rotation={[0.2, 0.3, 0.4]}>
          <cylinderGeometry args={[0.12, 0.22, 0.36, 16]} />
          <meshStandardMaterial color="#38241b" roughness={0.4} />
        </mesh>

        {/* Right Hair Crown Volume */}
        <mesh position={[0.18, 0.2, 0.1]} rotation={[0.1, -0.2, -0.3]}>
          <cylinderGeometry args={[0.13, 0.24, 0.38, 16]} />
          <meshStandardMaterial color="#38241b" roughness={0.4} />
        </mesh>

        {/* Left Face-Framing Wavy Locks (Cascading down over shoulder) */}
        <group ref={hairLeftLockRef} position={[-0.3, 0.02, 0.1]}>
          <mesh position={[0, -0.18, 0.08]} rotation={[0.1, 0.2, 0.25]}>
            <cylinderGeometry args={[0.07, 0.09, 0.42, 16]} />
            <meshStandardMaterial color="#342016" roughness={0.42} />
          </mesh>
          <mesh position={[-0.04, -0.42, 0.12]} rotation={[-0.1, 0.1, -0.15]}>
            <cylinderGeometry args={[0.08, 0.06, 0.34, 16]} />
            <meshStandardMaterial color="#2d1a12" roughness={0.42} />
          </mesh>
        </group>

        {/* Right Face-Framing Wavy Locks (Cascading down over shoulder) */}
        <group ref={hairRightLockRef} position={[0.3, 0.02, 0.1]}>
          <mesh position={[0, -0.18, 0.08]} rotation={[0.1, -0.2, -0.25]}>
            <cylinderGeometry args={[0.07, 0.09, 0.42, 16]} />
            <meshStandardMaterial color="#342016" roughness={0.42} />
          </mesh>
          <mesh position={[0.04, -0.42, 0.12]} rotation={[-0.1, -0.1, 0.15]}>
            <cylinderGeometry args={[0.08, 0.06, 0.34, 16]} />
            <meshStandardMaterial color="#2d1a12" roughness={0.42} />
          </mesh>
        </group>

        {/* Rear Hair Volume */}
        <mesh position={[0, -0.12, -0.2]}>
          <boxGeometry args={[0.62, 0.65, 0.25]} />
          <meshStandardMaterial color="#28170f" roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
};

/**
 * Accessible Fallback UI for non-WebGL environments (and unit tests)
 * Displays the high-resolution reference portrait with state badges and controls
 */
export const AvatarFallbackCard: React.FC<{
  avatarState: AvatarCompanionState;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isVoicePlaying?: boolean;
  onStopVoice?: () => void;
}> = ({
  avatarState,
  voiceEnabled = true,
  onToggleVoice,
  isVoicePlaying = false,
  onStopVoice,
}) => {
  const stateMeta = useMemo(() => {
    switch (avatarState) {
      case "listening":
        return {
          title: "Listening...",
          badge: "Mic Active",
          color: "#0d9488",
          bgColor: "#f0fdfa",
          description: "Listening attentively. Speak your health questions naturally.",
        };
      case "thinking":
        return {
          title: "Analyzing...",
          badge: "Thinking",
          color: "#6366f1",
          bgColor: "#eef2ff",
          description: "Formulating evidence-based clinical wellness guidance.",
        };
      case "speaking":
        return {
          title: "Speaking...",
          badge: "Audio Active",
          color: "#10b981",
          bgColor: "#ecfdf5",
          description: "Reading companion guidance aloud with synchronized cadence.",
        };
      case "error":
        return {
          title: "Notice",
          badge: "Needs Attention",
          color: "#d97706",
          bgColor: "#fffbeb",
          description: "Operation could not complete. You can retry your request.",
        };
      case "idle":
      default:
        return {
          title: "MANVIA Care Companion",
          badge: "Ready",
          color: "#0d9488",
          bgColor: "#f0fdfa",
          description: "Warm, empathetic healthcare companion ready to support your health journey.",
        };
    }
  }, [avatarState]);

  return (
    <div
      className="manvia-avatar-fallback-card"
      data-testid="avatar-fallback-card"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: `radial-gradient(ellipse at 50% 25%, ${stateMeta.bgColor} 0%, var(--color-bg-surface, #ffffff) 70%)`,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* High-Resolution Virtual Healthcare Companion Portrait */}
      <div
        style={{
          position: "relative",
          width: "220px",
          height: "220px",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: `3px solid ${stateMeta.color}`,
          boxShadow: isVoicePlaying
            ? `0 0 0 8px ${stateMeta.color}25, 0 12px 32px ${stateMeta.color}40`
            : `0 8px 24px rgba(13, 148, 136, 0.15)`,
          backgroundColor: "#f1f5f9",
          transition: "all 300ms ease",
          marginBottom: "16px",
        }}
      >
        <img
          src="/manvia-companion-portrait.jpg"
          alt="MANVIA Virtual Healthcare Companion"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 20%",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Identity & Status */}
      <div style={{ textAlign: "center", maxWidth: "340px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--color-text-primary, #0f172a)", fontWeight: 700 }}>
            {stateMeta.title}
          </h3>
          <span
            data-testid="avatar-state-badge"
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: stateMeta.color,
              backgroundColor: `${stateMeta.color}18`,
              padding: "2px 8px",
              borderRadius: "12px",
            }}
          >
            {stateMeta.badge}
          </span>
        </div>

        <p
          style={{
            margin: "0 0 14px",
            fontSize: "0.85rem",
            color: "var(--color-text-secondary, #64748b)",
            lineHeight: 1.4,
          }}
        >
          {stateMeta.description}
        </p>

        {/* Quick Audio Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              data-testid="avatar-voice-toggle-btn"
              style={{
                fontSize: "0.78rem",
                padding: "5px 12px",
                borderRadius: "20px",
                border: "1px solid var(--color-border-subtle, #e2e8f0)",
                backgroundColor: voiceEnabled ? "#f0fdfa" : "var(--color-bg-surface, #ffffff)",
                color: voiceEnabled ? "#0f766e" : "var(--color-text-muted, #64748b)",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {voiceEnabled ? "🔊 Spoken: ON" : "🔇 Spoken: OFF"}
            </button>
          )}

          {isVoicePlaying && onStopVoice && (
            <button
              type="button"
              onClick={onStopVoice}
              data-testid="avatar-stop-voice-btn"
              style={{
                fontSize: "0.78rem",
                padding: "5px 12px",
                borderRadius: "20px",
                border: "1px solid #ef4444",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ⏹ Stop Audio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export interface ManviaAvatar3DProps {
  state?: AvatarCompanionState;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isVoicePlaying?: boolean;
  onStopVoice?: () => void;
  visemeState?: SpeechVisemeState;
  // Interactive Microphone controls
  isRecording?: boolean;
  recordingSeconds?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  isTranscribing?: boolean;
  // Error handling
  onRetry?: () => void;
  errorMessage?: string | null;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Main Interactive MANVIA Healthcare Companion Avatar Panel
 */
export const ManviaAvatar3D: React.FC<ManviaAvatar3DProps> = ({
  state = "idle",
  voiceEnabled = true,
  onToggleVoice,
  isVoicePlaying = false,
  onStopVoice,
  visemeState,
  isRecording = false,
  recordingSeconds = 0,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  isTranscribing = false,
  onRetry,
  errorMessage,
  compact = false,
  className = "",
  style = {},
}) => {
  const isWebGLAvailable = useWebGLSupport();
  const prefersReducedMotion = useReducedMotion();
  const [viewMode, setViewMode] = React.useState<"3d" | "portrait">("3d");

  const stateAnnouncement = useMemo(() => {
    switch (state) {
      case "listening":
        return "MANVIA Companion is listening attentively to microphone input";
      case "thinking":
        return "MANVIA Companion is formulating healthcare guidance";
      case "speaking":
        return "MANVIA Companion is speaking with synchronized facial animation";
      case "error":
        return "MANVIA Companion encountered an issue. You can retry your request.";
      case "idle":
      default:
        return "MANVIA Companion is ready";
    }
  }, [state]);

  const fallbackElement = (
    <AvatarFallbackCard
      avatarState={state}
      voiceEnabled={voiceEnabled}
      onToggleVoice={onToggleVoice}
      isVoicePlaying={isVoicePlaying}
      onStopVoice={onStopVoice}
    />
  );

  return (
    <div
      className={`manvia-avatar-3d-wrapper ${className}`}
      data-testid="manvia-avatar-3d"
      data-avatar-state={state}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: compact ? "280px" : "440px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "24px",
        overflow: "hidden",
        border: "1px solid var(--color-border-subtle, #e2e8f0)",
        background: "radial-gradient(ellipse at 50% 25%, #f0fdfa 0%, #f8fafc 60%, #e2e8f0 100%)",
        boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
        ...style,
      }}
      role="region"
      aria-label="3D MANVIA Healthcare Companion Avatar"
    >
      {/* Live Region for Screen Readers */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        data-testid="avatar-live-status"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {stateAnnouncement}
      </div>

      {/* Top Header Controls Bar */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "14px",
          right: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
          pointerEvents: "auto",
        }}
      >
        {/* State Badge Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(10px)",
            padding: "4px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(13, 148, 136, 0.25)",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                state === "speaking"
                  ? "#10b981"
                  : state === "listening"
                    ? "#0d9488"
                    : state === "thinking"
                      ? "#6366f1"
                      : state === "error"
                        ? "#f59e0b"
                        : "#0ea5e9",
              boxShadow: `0 0 8px ${
                state === "speaking"
                  ? "#10b981"
                  : state === "listening"
                    ? "#0d9488"
                    : state === "thinking"
                      ? "#6366f1"
                      : "#0ea5e9"
              }`,
            }}
          />
          <span
            data-testid="avatar-overlay-state-label"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#0f172a",
              textTransform: "capitalize",
            }}
          >
            {state === "speaking"
              ? "Speaking (Lip-Synced)"
              : state === "listening"
                ? "Listening..."
                : state === "thinking"
                  ? "Thinking..."
                  : state === "error"
                    ? "Notice"
                    : "Ready • Companion"}
          </span>
        </div>

        {/* Action Controls: 3D/Portrait Toggle & Audio Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isWebGLAvailable && (
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "3d" ? "portrait" : "3d")}
              title={viewMode === "3d" ? "Switch to Portrait View" : "Switch to 3D Avatar View"}
              aria-label="Toggle avatar view mode"
              data-testid="avatar-view-mode-toggle"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                border: "1px solid rgba(13, 148, 136, 0.25)",
                borderRadius: "20px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#0f766e",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {viewMode === "3d" ? "🖼️ Portrait" : "🌐 3D View"}
            </button>
          )}

          {onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              title={voiceEnabled ? "Mute Companion voice" : "Enable Companion voice"}
              aria-label={voiceEnabled ? "Mute Companion voice" : "Enable Companion voice"}
              data-testid="avatar-voice-quick-toggle"
              style={{
                backgroundColor: voiceEnabled ? "rgba(240, 253, 250, 0.9)" : "rgba(255, 255, 255, 0.85)",
                border: "1px solid rgba(13, 148, 136, 0.25)",
                borderRadius: "20px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: voiceEnabled ? "#0f766e" : "#64748b",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              {voiceEnabled ? "🔊 Spoken: ON" : "🔇 Spoken: OFF"}
            </button>
          )}

          {isVoicePlaying && onStopVoice && (
            <button
              type="button"
              onClick={onStopVoice}
              title="Stop speech playback"
              aria-label="Stop speech playback"
              data-testid="avatar-stop-speech-button"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #ef4444",
                borderRadius: "20px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#b91c1c",
                cursor: "pointer",
              }}
            >
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Main Avatar Canvas or Portrait View */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {!isWebGLAvailable || viewMode === "portrait" ? (
          fallbackElement
        ) : (
          <CanvasContainer
            ariaLabel="MANVIA Interactive 3D Human-Like Healthcare Companion"
            cameraPosition={[0, 0.12, 2.3]}
            fov={38}
            fallback={fallbackElement}
            style={{ height: "100%", width: "100%" }}
          >
            <HumanAvatar3DScene
              avatarState={state}
              isVoicePlaying={isVoicePlaying}
              visemeState={visemeState}
              reducedMotion={prefersReducedMotion}
            />
          </CanvasContainer>
        )}
      </div>

      {/* Bottom Avatar Controls (Microphone & Status Banner) */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(13, 148, 136, 0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          zIndex: 10,
        }}
      >
        {/* Active Microphone Recording State */}
        {isRecording ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  animation: "pulse 1.5s infinite",
                  boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
                }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#b91c1c" }}>
                Listening ({String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")})
              </span>
            </div>
            {onCancelRecording && (
              <button
                type="button"
                onClick={onCancelRecording}
                aria-label="Cancel recording"
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
            {onStopRecording && (
              <button
                type="button"
                onClick={onStopRecording}
                aria-label="Done recording"
                style={{
                  padding: "4px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#0d9488",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Done ✓
              </button>
            )}
          </div>
        ) : isTranscribing ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", color: "#0f766e", fontWeight: 600 }}>
              ⏳ Transcribing your speech with Whisper...
            </span>
          </div>
        ) : onStartRecording ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onStartRecording}
              aria-label="Activate microphone"
              data-testid="avatar-mic-activate-btn"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                border: "none",
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                color: "#ffffff",
                fontSize: "1.4rem",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
                transition: "all 150ms ease",
              }}
            >
              🎙️
            </button>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                Tap to Speak
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Speech-to-text with Groq Whisper
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
            {stateAnnouncement}
          </div>
        )}

        {/* Error Retry Notice */}
        {errorMessage && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "2px 10px",
              borderRadius: "6px",
              border: "1px solid #f59e0b",
              background: "#fffbeb",
              color: "#b45309",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry Action
          </button>
        )}
      </div>
    </div>
  );
};
