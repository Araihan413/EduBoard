/**
 * Board3D.tsx
 *
 * 3D Papan Permainan EduBoard PAI menggunakan peta 2.5D premium:
 * - Menumpuk 6 layer gambar map di public/map/ (bg -> batu -> danau -> jalan -> pohon -> semak)
 * - 50 petak ubin lingkaran 3D silinder pipih dengan emoji logo tipe kartu pertanyaan di atas jalan
 * - Pion 3D berukuran ideal yang meluncur mulus dari ubin ke ubin
 * - Dadu 3D real-time yang memantul dan berputar di tengah papan mengikuti state rolling game.
 * - Latar belakang luas bergaya "Clash of Clans Base" dengan lantai rumput hijau subur dan bebatuan 3D di sekeliling papan.
 * - Fitur interaktif Zoom & Pan gerak bebas menggunakan MapControls.
 */

"use client";

import { useRef, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrthographicCamera,
  useTexture,
  MapControls,
} from "@react-three/drei";
import * as THREE from "three";

import {
  TILE_GRAPH,
  type TileConfig,
} from "../config/gameConfig";
import type { Group } from "../../../store/gameStore";

// ─── 🗺️ KONFIGURASI LAYER PETA 2.5D (KALIBRASI) ───────────────────────────────
const LAYER_CONFIGS = {
  bg: {
    y: 0.00,
    pos: [0.0, 0.0] as [number, number],
    scale: [20.0, 16.3] as [number, number],
    opacity: 1.0,
  },
};

// Ketinggian ubin lingkaran 3D
const TILE_Y = 0.02;
const TILE_TOP_Y = TILE_Y + 0.04;

// ─── Warna Ubin & Emissive ───────────────────────────────────────────────────
const TILE_COLORS: Record<string, string> = {
  DASAR: "#3b82f6",
  TANTANGAN: "#ef4444",
  PEMAHAMAN: "#f97316",
  SKIP: "#cbd5e1",
  STAR: "#facc15",
};

const TILE_EMISSIVE: Record<string, string> = {
  DASAR: "#1d4ed8",
  TANTANGAN: "#b91c1c",
  PEMAHAMAN: "#c2410c",
  SKIP: "#94a3b8",
  STAR: "#d97706",
};

// ─── 🎨 KUSTOM PRE-RENDER TEXTURE ─────────────────────────────────────────────
function useTileTextures() {
  return useMemo(() => {
    const textures: Record<number, THREE.CanvasTexture> = {};
    if (typeof window === "undefined") return textures;

    TILE_GRAPH.forEach((tile) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, 256, 256);

      const type = tile.type;
      let color = "#3b82f6";
      if (type === "SKIP") color = "#cbd5e1";
      else if (type === "STAR") color = "#facc15";
      else if (type === "TANTANGAN") color = "#ef4444";
      else if (type === "PEMAHAMAN") color = "#f97316";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = type === "SKIP" ? "#94a3b8" : "#ffffff";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(128, 128, 102, 0, Math.PI * 2);
      ctx.stroke();

      if (tile.id !== 0) {
        let emoji = "";
        if (type === "DASAR") emoji = "🎯";
        else if (type === "TANTANGAN") emoji = "🔥";
        else if (type === "PEMAHAMAN") emoji = "📝";
        else if (type === "SKIP") emoji = "💤";
        else if (type === "STAR") emoji = "★";

        ctx.font = "88px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, 128, 128);
      } else {
        ctx.font = "bold 52px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("START", 128, 128);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures[tile.id] = texture;
    });

    return textures;
  }, []);
}

// ─── 🔴 SATU PETAK UBIN LINGKARAN 3D ─────────────────────────────────────────
function Tile3D({ tile, texture }: { tile: TileConfig; texture?: THREE.CanvasTexture }) {
  const x = tile.x;
  const z = tile.y;

  const color = TILE_COLORS[tile.type] ?? "#3b82f6";
  const emissive = TILE_EMISSIVE[tile.type] ?? "#1d4ed8";
  const scale = tile.id === 0 ? 1.9 : 1;

  return (
    <group position={[x, TILE_Y, z]} scale={[scale, scale, scale]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.50, 0.08, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={tile.type === "STAR" ? 0.35 : 0.05}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      {texture && (
        <mesh position={[0, 0.0415, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.455, 24]} />
          <meshBasicMaterial map={texture} transparent={true} />
        </mesh>
      )}
    </group>
  );
}

// BFS Pathfinder based on TILE_GRAPH to calculate intermediate steps between any two ubin
function findPath(fromId: number, toId: number): number[] | null {
  if (fromId === toId) return [];
  const queue: { id: number; path: number[] }[] = [{ id: fromId, path: [] }];
  const visited = new Set<number>();
  visited.add(fromId);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    const tile = TILE_GRAPH.find(t => t.id === id);
    if (!tile) continue;
    for (const nextId of tile.next) {
      if (nextId === toId) {
        return [...path, nextId];
      }
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, path: [...path, nextId] });
      }
    }
  }
  return null;
}

// ─── Offset pion ketika beberapa pemain di tile yang sama ─────────────────────
// Menghasilkan array offset (ox, oz) yang tersebar melingkar di dalam radius tile
// sehingga pion tidak saling menumpuk.
function computeSlotOffsets(
  count: number
): Array<{ ox: number; oz: number }> {
  if (count <= 1) return [{ ox: 0, oz: 0 }];
  // Radius offset disesuaikan agar tetap di dalam diameter tile (~0.46)
  const radius = count === 2 ? 0.16 : 0.19;
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { ox: Math.cos(angle) * radius, oz: Math.sin(angle) * radius };
  });
}

// ─── 🏃‍♂️ PION PEMAIN 3D ────────────────────────────────────────────────────────
function Pion({
  group,
  offsetX,
  offsetZ,
}: {
  group: Group;
  offsetX: number;
  offsetZ: number;
}) {
  const meshRef = useRef<THREE.Group>(null!);
  
  // Find current position coordinates on mount
  const initialTile = useMemo(() => {
    return TILE_GRAPH.find((t) => t.id === group.position) ?? TILE_GRAPH[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tx = initialTile.x + offsetX;
  const tz = initialTile.y + offsetZ;

  const targetRef = useRef({ x: tx, z: tz });
  const startPos = useRef({ x: tx, z: tz });
  const startTimeRef = useRef<number>(-1);

  // Keep a stable ref so the useFrame closure can always read latest offsets
  const offsetRef = useRef({ x: offsetX, z: offsetZ });
  useEffect(() => {
    offsetRef.current = { x: offsetX, z: offsetZ };
  }, [offsetX, offsetZ]);

  // Queue references for sequential step-by-step hopping
  const lastTargetRef = useRef<number>(group.position);
  const queueRef = useRef<number[]>([]);
  const activeTargetIdRef = useRef<number>(group.position);

  // Listen for changes to group.position (from WebSocket state updates)
  useEffect(() => {
    if (group.position !== lastTargetRef.current) {
      const path = findPath(lastTargetRef.current, group.position);
      
      // If path exists and is a valid forward walk (at most 6 steps based on max dice roll)
      if (path && path.length > 0 && path.length <= 6) {
        queueRef.current = [...queueRef.current, ...path];
        lastTargetRef.current = group.position;
      } else {
        // Teleport/Reset fallback: instantly snap visual pawn to target coordinates
        queueRef.current = [];
        lastTargetRef.current = group.position;
        activeTargetIdRef.current = group.position;
        
        const targetTileObj = TILE_GRAPH.find((t) => t.id === group.position) ?? TILE_GRAPH[0];
        const ox = offsetRef.current.x;
        const oz = offsetRef.current.z;
        targetRef.current = { x: targetTileObj.x + ox, z: targetTileObj.y + oz };
        startPos.current = { x: targetTileObj.x + ox, z: targetTileObj.y + oz };
        startTimeRef.current = -1;
        
        if (meshRef.current) {
          meshRef.current.position.x = targetTileObj.x + ox;
          meshRef.current.position.z = targetTileObj.y + oz;
          meshRef.current.position.y = 0;
          meshRef.current.rotation.x = 0;
          meshRef.current.rotation.z = 0;
        }
      }
    }
  }, [group.position]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const clockTime = state.clock.getElapsedTime();
    if (startTimeRef.current < 0) {
      startTimeRef.current = clockTime;
    }

    const DURATION = 0.42;
    let elapsed = clockTime - startTimeRef.current;

    // Check if the current hop is complete AND we have remaining steps in queue
    if (elapsed >= DURATION || startTimeRef.current === clockTime) {
      if (queueRef.current.length > 0) {
        const nextTileId = queueRef.current.shift()!;
        activeTargetIdRef.current = nextTileId;

        // Set new start position as current mesh coordinates
        startPos.current = {
          x: meshRef.current.position.x,
          z: meshRef.current.position.z
        };

        // Find next target coordinates (apply slot offset so pawn lands at its slot)
        const nextTile = TILE_GRAPH.find((t) => t.id === nextTileId) ?? TILE_GRAPH[0];
        const ox = offsetRef.current.x;
        const oz = offsetRef.current.z;
        targetRef.current = { x: nextTile.x + ox, z: nextTile.y + oz };

        // Reset timer
        startTimeRef.current = clockTime;
        elapsed = 0;
      }
    }

    const progress = Math.min(1, elapsed / DURATION);

    const totalDist = Math.sqrt(
      Math.pow(targetRef.current.x - startPos.current.x, 2) +
      Math.pow(targetRef.current.z - startPos.current.z, 2)
    );

    if (totalDist > 0.05 && progress < 1) {
      const easedT = -(Math.cos(Math.PI * progress) - 1) / 2;

      meshRef.current.position.x = startPos.current.x + (targetRef.current.x - startPos.current.x) * easedT;
      meshRef.current.position.z = startPos.current.z + (targetRef.current.z - startPos.current.z) * easedT;

      const hopHeight = 0.38;
      meshRef.current.position.y = 4 * hopHeight * progress * (1 - progress);
      
      const travelDirX = targetRef.current.x - startPos.current.x;
      const travelDirZ = targetRef.current.z - startPos.current.z;
      const dirLength = Math.sqrt(travelDirX * travelDirX + travelDirZ * travelDirZ);
      
      if (dirLength > 0.01) {
        const tiltAmount = 0.22 * Math.sin(progress * Math.PI);
        meshRef.current.rotation.z = -(travelDirX / dirLength) * tiltAmount;
        meshRef.current.rotation.x = (travelDirZ / dirLength) * tiltAmount;
      }
    } else {
      // Smooth lerp to rest exact target coordinates
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetRef.current.x, Math.min(delta * 12, 1));
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetRef.current.z, Math.min(delta * 12, 1));
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, 0, Math.min(delta * 12, 1));
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, 0, Math.min(delta * 12, 1));
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, Math.min(delta * 12, 1));
    }
  });

  const color = group.color ?? "#3b82f6";

  return (
    <group ref={meshRef} position={[tx, 0, tz]}>
      <mesh position={[0, TILE_TOP_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      <mesh position={[0, TILE_TOP_Y + 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.05, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>

      <mesh position={[0, TILE_TOP_Y + 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 0.18, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.3} />
      </mesh>

      <mesh position={[0, TILE_TOP_Y + 0.31, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.5} emissive={color} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

// ─── 🎬 SCENE UTAMA (R3F) ─────────────────────────────────────────────────────
function Scene({ groups }: { groups: Group[] }) {
  const { size } = useThree();

  const textures = useTexture({
    bg: "/map/map.webp",
    outerBg: "/map/map_background.webp",
  });

  const tileTextures = useTileTextures();
  const controlsRef = useRef<any>(null!);

  useFrame((state) => {
    if (controlsRef.current) {
      // 1. Biarkan controls melakukan update inersia/damping nya dahulu
      controlsRef.current.update();

      const target = controlsRef.current.target;
      const camera = state.camera as THREE.OrthographicCamera;
      const size = state.size;

      // 2. Hitung ukuran viewport kamera dalam koordinat dunia 3D berdasarkan zoom saat ini
      // lebar = size.width / zoom, tinggi = size.height / zoom
      const wView = size.width / camera.zoom;
      const hView = size.height / camera.zoom;

      // 3. Batasi jangkauan target secara dinamis mengikuti logika Clash of Clans (COC)
      // Ukuran ilustrasi landscape kustom (map_background.png) di bawah diset args={[51, 51]}.
      const wMap = 51.0;
      const hMap = 40.0;

      // Batas clamp dinamis = setengah dari selisih ukuran map dan lebar/tinggi viewport
      const clampX = Math.max(0, (wMap - wView) / 2);
      const clampZ = Math.max(0, (hMap - hView) / 2);

      const clampedX = THREE.MathUtils.clamp(target.x, -clampX, clampX);
      const clampedZ = THREE.MathUtils.clamp(target.z, -clampZ, clampZ);

      const dx = clampedX - target.x;
      const dz = clampedZ - target.z;

      if (dx !== 0 || dz !== 0) {
        target.x = clampedX;
        target.z = clampedZ;
        camera.position.x += dx;
        camera.position.z += dz;
      }

      // Kunci target Y tetap pada 0
      if (target.y !== 0) {
        const dy = 0 - target.y;
        target.y = 0;
        camera.position.y += dy;
      }
    }
  });

  useEffect(() => {
    return () => {
      Object.values(tileTextures).forEach((tex) => tex.dispose());
    };
  }, [tileTextures]);

  return (
    <>
      {/* Orthographic Camera Top-Down Tetap (Fokus Lurus, Mencegah Visual Miring/Distorsi) */}
      <OrthographicCamera
        makeDefault
        position={[0, 25, 0.0001]}
        zoom={Math.min(size.width / 13, size.height / 12.5)} // Responsive initial zoom
        near={0.1}
        far={1000}
      />

      {/* MapControls untuk interaksi gerak bebas (Zoom & Pan) tanpa rotasi */}
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        enableZoom={true}
        enablePan={true}
        screenSpacePanning={true} // Harus true agar geseran mengikuti sumbu X dan Y layar secara intuitif
        minZoom={Math.min(size.width / 22, size.height / 20)}  // Limit zoom-out (adaptive for mobile portrait)
        maxZoom={size.height / 6.5} // Limit zoom-in
        enableDamping
        dampingFactor={0.06}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: -1 as any,
          RIGHT: -1 as any,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />

      {/* Pencahayaan Dunia Virtual */}
      <ambientLight intensity={0.95} />
      <directionalLight
        position={[8, 18, 8]}
        intensity={1.25}
        castShadow
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#cbd5e1" />

      {/* =======================================================================
          LANTAI DASAR WARNA RUMPUT HARMONIS (BASE SOLID FLOOR - PREVENTS BORDERS)
          ======================================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#658a3a" 
          roughness={0.99} 
        />
      </mesh>

      {/* =======================================================================
          LATAR BELAKANG MAP EDISI TERBARU (PREMIUM STYLIZED BACKGROUND - SCENERY)
          ======================================================================= */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[51, 51]} />
        <meshStandardMaterial 
          map={textures.outerBg} 
          map-colorSpace={THREE.SRGBColorSpace}
          transparent
          opacity={1.0}
          roughness={0.95} 
        />
      </mesh>

      {/* =======================================================================
          GRUP AKTIF PAPAN & INTERAKSI (DI-SHIFT KE ATAS MENGHINDARI BOTTOM HUD)
          ======================================================================= */}
      <group position={[1, 0, -1.2]}>
        {/* =======================================================================
            SINGLE LAYER LINGKUNGAN MAP (Peta Ubin)
            ======================================================================= */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LAYER_CONFIGS.bg.pos[0], LAYER_CONFIGS.bg.y, LAYER_CONFIGS.bg.pos[1]]} receiveShadow>
          <planeGeometry args={[LAYER_CONFIGS.bg.scale[0], LAYER_CONFIGS.bg.scale[1]]} />
          <meshStandardMaterial map={textures.bg} roughness={0.95} transparent opacity={LAYER_CONFIGS.bg.opacity} />
        </mesh>

        {/* =======================================================================
            PETAK UBIN LINGKARAN 3D
            ======================================================================= */}
        {TILE_GRAPH.map((tile) => (
          <Tile3D key={tile.id} tile={tile} texture={tileTextures[tile.id]} />
        ))}

        {/* Bayangan halus di atas papan untuk pion */}
        <ContactShadows
          position={[0, TILE_TOP_Y + 0.001, 0]}
          opacity={0.35}
          scale={20}
          blur={1.5}
          far={1.2}
          resolution={256}
          color="#000000"
        />

        {/* =======================================================================
            PION TIM GURU & SISWA
            Offset dihitung per-tile agar pion tidak saling menumpuk.
            ======================================================================= */}
        {(() => {
          // Kelompokkan group berdasarkan tile saat ini
          const tileGroups: Record<number, string[]> = {};
          groups.forEach((g) => {
            if (!tileGroups[g.position]) tileGroups[g.position] = [];
            tileGroups[g.position].push(g.id);
          });

          // Buat map: groupId -> slot offset
          const slotMap: Record<string, { ox: number; oz: number }> = {};
          Object.entries(tileGroups).forEach(([, gIds]) => {
            const offsets = computeSlotOffsets(gIds.length);
            gIds.forEach((id, i) => {
              slotMap[id] = offsets[i];
            });
          });

          return groups.map((group) => {
            const slot = slotMap[group.id] ?? { ox: 0, oz: 0 };
            return (
              <Pion
                key={group.id}
                group={group}
                offsetX={slot.ox}
                offsetZ={slot.oz}
              />
            );
          });
        })()}
      </group>
    </>
  );
}

// ─── 📦 BOARD3D UTAMA (EXPORT) ────────────────────────────────────────────────
interface Board3DProps {
  groups: Group[];
}

export default function Board3D({ groups }: Board3DProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Kontainer map dinamis: 100% full-screen tanpa border atau rounding agar membaur penuh */}
      <div className="w-full h-full relative overflow-hidden">
        <Suspense fallback={
          <div className="absolute inset-0 bg-[#658a3a] flex items-center justify-center text-white/50 text-xs">
            Memuat Map Permainan...
          </div>
        }>
          <Canvas
            shadows={false}
            frameloop="always"
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              powerPreference: "default",
            }}
            style={{ width: "100%", height: "100%" }}
            camera={{ position: [0, 25, 0.0001], zoom: 28, near: 0.1, far: 300 }}
          >
            <Scene groups={groups} />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
}
