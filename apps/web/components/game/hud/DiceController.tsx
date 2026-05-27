"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────

interface DiceControllerProps {
  size?: number;
  value: number;
  isRolling: boolean;
  isMyTurn: boolean;
  onClick?: () => void;
}

// ─── CONSTANTS & CONFIGURATION ────────────────────────────────────────────────

// Coordinates for dots on a 128x128 face canvas
const DOT_POSITIONS: Record<number, number[][]> = {
  1: [[64, 64]],
  2: [[35, 35], [93, 93]],
  3: [[35, 35], [64, 64], [93, 93]],
  4: [[35, 35], [35, 93], [93, 35], [93, 93]],
  5: [[35, 35], [35, 93], [64, 64], [93, 35], [93, 93]],
  6: [[35, 35], [35, 64], [35, 93], [93, 35], [93, 64], [93, 93]],
};

// Target Euler orientations in Three.js coordinates to face the camera [0, 0, 1]
const TARGET_ROTATIONS: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  2: new THREE.Euler(0, -Math.PI / 2, 0),
  3: new THREE.Euler(Math.PI / 2, 0, 0),
  4: new THREE.Euler(-Math.PI / 2, 0, 0),
  5: new THREE.Euler(0, Math.PI / 2, 0),
  6: new THREE.Euler(0, Math.PI, 0),
};

// ─── WEBGL DICE MESH COMPONENT ───────────────────────────────────────────────

interface Dice3DProps {
  isRolling: boolean;
  value: number;
  textures: THREE.CanvasTexture[];
}

function Dice3D({ isRolling, value, textures }: Dice3DProps) {
  const meshRef = useRef<THREE.Group>(null!);

  // Rotation and bounce physics tracking variables
  const spinAxis = useRef(new THREE.Vector3(1, 1.5, 0.5).normalize());

  // Create a single solid white ceramic material for the RoundedBox base
  const baseMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transmission: 0.0,
    });
  }, []);

  // Create materials for the 6 faces using the pre-rendered textures
  const faceMaterials = useMemo(() => {
    return textures.map((tex) => {
      return new THREE.MeshPhysicalMaterial({
        map: tex,
        roughness: 0.1,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      });
    });
  }, [textures]);

  // Clean up materials on unmount
  useEffect(() => {
    return () => {
      baseMaterial.dispose();
      faceMaterials.forEach((mat) => mat.dispose());
    };
  }, [baseMaterial, faceMaterials]);

  // Target orientation quaternion based on the dice result
  const targetQuat = useMemo(() => {
    const targetEuler = TARGET_ROTATIONS[value] ?? TARGET_ROTATIONS[1];
    return new THREE.Quaternion().setFromEuler(targetEuler);
  }, [value]);

  // Real-time animation physics frame loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Safety clamp delta to prevent giant jumps when tab goes inactive
    const d = Math.min(delta, 0.1);

    if (isRolling) {
      // 1. Spin vigorously around diagonal axis using quaternion multiplication
      const spinSpeed = 18; // radians per second
      const stepRotation = new THREE.Quaternion().setFromAxisAngle(spinAxis.current, spinSpeed * d);
      meshRef.current.quaternion.multiplyQuaternions(stepRotation, meshRef.current.quaternion);

      // 2. Parabolic high-frequency bouncing path
      const bounceFreq = state.clock.getElapsedTime() * 14;
      const height = Math.abs(Math.sin(bounceFreq)) * 0.15;
      meshRef.current.position.y = height;

      // 3. Squash and Stretch effect based on ground proximity (y close to 0)
      const squashFactor = Math.max(0, 1 - (height / 0.15)); // ranges from 0 to 1
      meshRef.current.scale.set(
        1.1 * (1 + squashFactor * 0.16), // widen horizontally on impact
        1.1 * (1 - squashFactor * 0.20), // flatten vertically on impact
        1.1 * (1 + squashFactor * 0.16)  // widen horizontally on impact
      );
    } else {
      // 1. Spherically linear interpolate (Slerp) to the mathematically exact target face
      meshRef.current.quaternion.slerp(targetQuat, d * 11);

      // 2. Smoothly damp/lerp back to the ground plane
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, d * 12);

      // 3. Smoothly restore scale back to perfect uniform unit size
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, 1.1, d * 12);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, 1.1, d * 12);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, 1.1, d * 12);
    }
  });

  const offset = 0.678; // Just slightly above 1.35/2 = 0.675 to prevent Z-fighting

  return (
    <group ref={meshRef} scale={[1.1, 1.1, 1.1]}>
      {/* The beautiful rounded base box of the dice */}
      <RoundedBox
        args={[1.35, 1.35, 1.35]}
        radius={0.20} // Premium glossy rounded corners
        smoothness={5}
        castShadow
        material={baseMaterial}
      />

      {/* Front Face: Value 1 (textures[0]) */}
      <mesh position={[0, 0, offset]} rotation={[0, 0, 0]} material={faceMaterials[0]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>

      {/* Back Face: Value 6 (textures[5]) */}
      <mesh position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} material={faceMaterials[5]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>

      {/* Top Face: Value 3 (textures[2]) */}
      <mesh position={[0, offset, 0]} rotation={[-Math.PI / 2, 0, 0]} material={faceMaterials[2]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>

      {/* Bottom Face: Value 4 (textures[3]) */}
      <mesh position={[0, -offset, 0]} rotation={[Math.PI / 2, 0, 0]} material={faceMaterials[3]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>

      {/* Right Face: Value 2 (textures[1]) */}
      <mesh position={[offset, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={faceMaterials[1]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>

      {/* Left Face: Value 5 (textures[4]) */}
      <mesh position={[-offset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={faceMaterials[4]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>
    </group>
  );
}

// ─── MAIN DICE CONTROLLER COMPONENT ──────────────────────────────────────────

export default function DiceController({
  size = 75,
  value,
  isRolling,
  isMyTurn,
  onClick,
}: DiceControllerProps) {
  // Pre-render beautiful glossy canvas-based textures with inner shadows once
  const textures = useMemo(() => {
    if (typeof window === "undefined") return [];

    const bgColor = "#ffffff";      // Porcelain white
    const dotColor = "#0f172a";     // Deep Slate-900 dots
    const redDotColor = "#dc2626";  // Premium Asian Crimson-600 center dot

    return Array.from({ length: 6 }).map((_, index) => {
      const val = index + 1;
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Clean background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 128, 128);

      // Inner bevel border shading
      ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 122, 122);

      const dots = DOT_POSITIONS[val] || [];
      const isOne = val === 1;
      const currentDotColor = isOne ? redDotColor : dotColor;

      dots.forEach(([x, y]) => {
        const radius = isOne ? 17 : 8.5;

        // 1. Subtle soft drop-shadow for deep recessed look
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.beginPath();
        ctx.arc(x, y + 1.5, radius + 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Core solid dot color
        ctx.fillStyle = currentDotColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Dynamic specular highlight reflection for glossy depth
        ctx.fillStyle = isOne ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(x - (isOne ? 4.5 : 2), y - (isOne ? 4.5 : 2), isOne ? 4.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
  }, []);

  // Dispose of textures on unmount to prevent VRAM memory leak
  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex?.dispose());
    };
  }, [textures]);

  const validTextures = useMemo(() => {
    return textures.filter((tex): tex is THREE.CanvasTexture => tex !== null);
  }, [textures]);

  return (
    <motion.div
      whileHover={isMyTurn ? { scale: 1.12 } : {}}
      whileTap={isMyTurn ? { scale: 0.94 } : {}}
      transition={{ type: "spring", stiffness: 350, damping: 15 }}
      className={`relative flex items-center justify-center ${
        isMyTurn ? "cursor-pointer pointer-events-auto" : "pointer-events-none opacity-85"
      }`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Sonar Radar Wave Ripple (Only when isMyTurn) */}
      {isMyTurn && (
        <div className="absolute inset-[-12px] rounded-full border-2 border-orange-500/20 animate-ping pointer-events-none z-0" />
      )}

      {/* Floating Chat Bubble Badge "Lempar Dadu!" */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: -52, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.8 }}
            className="absolute -top-12 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-[0_6px_20px_rgba(245,158,11,0.4)] border border-amber-400 whitespace-nowrap z-50 flex items-center gap-1.5 pointer-events-none animate-bounce"
          >
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            Lempar Dadu!
            
            {/* Small triangle arrow to turn it into a chat bubble */}
            <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rotate-45 border-r border-b border-amber-400 z-[-1]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background radial spotlight glow matching general premium game aesthetics */}
      <div className="absolute inset-[-40px] bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

      {/* WebGL Canvas rendering 3D dice */}
      <motion.div
        animate={isRolling ? { y: [0, -22, 0] } : { y: 0 }}
        transition={
          isRolling
            ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 300, damping: 20 }
        }
        className="w-full h-full relative"
        style={{ zIndex: 10 }}
      >
        {validTextures.length === 6 && (
          <Canvas
            shadows={false}
            gl={{ alpha: true, antialias: true, powerPreference: "default" }}
            camera={{ position: [0, 0, 3.8], fov: 38 }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            {/* Virtual Studio Lighting Setup */}
            <ambientLight intensity={1.6} />
            <directionalLight position={[5, 6, 4]} intensity={2.6} />
            <directionalLight position={[-4, -5, 2]} intensity={0.4} color="#94a3b8" />

            <Dice3D isRolling={isRolling} value={value} textures={validTextures} />
          </Canvas>
        )}
      </motion.div>

      {/* Dynamic breathing physical shadow mapping to real-time bounce status */}
      <motion.div
        animate={
          isRolling
            ? { scale: [1, 0.72, 1], opacity: [0.16, 0.05, 0.16], y: [0, 2, 0] }
            : { scale: 1, opacity: 0.16, y: 0 }
        }
        transition={
          isRolling
            ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
        className="absolute -bottom-1.5 w-[90%] h-3 bg-black blur-[7px] rounded-full pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </motion.div>
  );
}
