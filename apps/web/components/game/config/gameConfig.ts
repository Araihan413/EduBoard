import type { TileType } from "../../../types/game";

export type { TileType };

export interface TileConfig {
  id: number;
  type: TileType;
  x: number;
  y: number;
  rotation: number;
  next: number[];
}

export type OrnamentType = "TREE" | "POND" | "FLOWER";

export interface OrnamentConfig {
  id: string;
  type: OrnamentType;
  x: number;
  y: number;
}



// ─── CUSTOM TILE GRAPH (MENIRU LAYOUT MAP.PNG PRESISI) ───────────────
// Koordinat [x, y] di bawah ini telah disesuaikan secara visual untuk meniru
// jalur batu, jembatan kayu, dan tikungan pada gambar map.png rasio 4:3.
const CUSTOM_GRAPH: TileConfig[] = [
  { id: 0, type: "DASAR", x: -8.4, y: -6.07, rotation: 0, next: [1] },

  { id: 1, type: "STAR", x: -6.7, y: -5.8, rotation: 0, next: [2] },
  { id: 2, type: "DASAR", x: -5.2, y: -6.1, rotation: 0, next: [3] },
  { id: 3, type: "PEMAHAMAN", x: -3.65, y: -6.2, rotation: 0, next: [4] },
  { id: 4, type: "TANTANGAN", x: -2.1, y: -6.2, rotation: 0, next: [5] },
  { id: 5, type: "STAR", x: -0.55, y: -6.2, rotation: 0, next: [6, 35] },
  { id: 6, type: "DASAR", x: 1.38, y: -6.15, rotation: 0, next: [7] },
  { id: 7, type: "TANTANGAN", x: 2.9, y: -6.2, rotation: 0, next: [8] },
  { id: 8, type: "SKIP", x: 4.4, y: -6.2, rotation: 0, next: [9] },
  { id: 9, type: "DASAR", x: 6, y: -6.2, rotation: 0, next: [10] },
  { id: 10, type: "PEMAHAMAN", x: 7.6, y: -6, rotation: 0, next: [11] },
  { id: 11, type: "TANTANGAN", x: 7.6, y: -4.6, rotation: 0, next: [12] },
  { id: 12, type: "DASAR", x: 7.6, y: -3.2, rotation: 0, next: [13] },
  { id: 13, type: "DASAR", x: 7.6, y: -1.7, rotation: 0, next: [14] },
  { id: 14, type: "STAR", x: 7.65, y: -0.2, rotation: 0, next: [15, 39] },
  { id: 15, type: "TANTANGAN", x: 7.8, y: 1.8, rotation: 0, next: [16] },
  { id: 16, type: "DASAR", x: 8, y: 3.45, rotation: 0, next: [17] },
  { id: 17, type: "PEMAHAMAN", x: 8.05, y: 4.95, rotation: 0, next: [18] },
  { id: 18, type: "TANTANGAN", x: 7.4, y: 6.4, rotation: 0, next: [19] },
  { id: 19, type: "PEMAHAMAN", x: 5.8, y: 6.65, rotation: 0, next: [20] },
  { id: 20, type: "DASAR", x: 4.2, y: 6.6, rotation: 0, next: [21] },
  { id: 21, type: "DASAR", x: 2.67, y: 6.25, rotation: 0, next: [22] },
  { id: 22, type: "SKIP", x: 1.19, y: 5.82, rotation: 0, next: [23] },
  { id: 23, type: "TANTANGAN", x: -0.36, y: 5.2, rotation: 0, next: [24] },
  { id: 24, type: "STAR", x: -1.7, y: 4.35, rotation: 0, next: [25, 47] },
  { id: 25, type: "TANTANGAN", x: -3.7, y: 5, rotation: 0, next: [26] },
  { id: 26, type: "PEMAHAMAN", x: -4.1, y: 6.6, rotation: 0, next: [27] },
  { id: 27, type: "SKIP", x: -5.7, y: 6.3, rotation: 0, next: [28] },
  { id: 28, type: "DASAR", x: -7.1, y: 5.55, rotation: 0, next: [29] },
  { id: 29, type: "PEMAHAMAN", x: -7.75, y: 4, rotation: 0, next: [30] },
  { id: 30, type: "TANTANGAN", x: -7.85, y: 2.4, rotation: 0, next: [31] },
  { id: 31, type: "SKIP", x: -7.78, y: 0.65, rotation: 0, next: [32] },
  { id: 32, type: "DASAR", x: -7.6, y: -1.15, rotation: 0, next: [33] },
  { id: 33, type: "TANTANGAN", x: -7.75, y: -2.9, rotation: 0, next: [34] },
  { id: 34, type: "PEMAHAMAN", x: -7.6, y: -4.4, rotation: 0, next: [1] },
  { id: 35, type: "PEMAHAMAN", x: 0.8, y: -4.6, rotation: 0, next: [36] },
  { id: 36, type: "STAR", x: 1.9, y: -3.25, rotation: 0, next: [37, 43] },
  { id: 37, type: "PEMAHAMAN", x: 3.06, y: -1.5, rotation: 0, next: [38] },
  { id: 38, type: "DASAR", x: 4, y: -0.2, rotation: 0, next: [40] },
  { id: 39, type: "DASAR", x: 6.4, y: 0.9, rotation: 0, next: [40] },
  { id: 40, type: "TANTANGAN", x: 4.7, y: 1.35, rotation: 0, next: [41] },
  { id: 41, type: "DASAR", x: 3.1, y: 2.6, rotation: 0, next: [42] },
  { id: 42, type: "PEMAHAMAN", x: 1.95, y: 4.2, rotation: 0, next: [22] },
  { id: 43, type: "TANTANGAN", x: 1.5, y: -1.25, rotation: 0, next: [44] },
  { id: 44, type: "PEMAHAMAN", x: 0.3, y: -0.1, rotation: 0, next: [45] },
  { id: 45, type: "DASAR", x: -1.15, y: 0.6, rotation: 0, next: [46] },
  { id: 46, type: "DASAR", x: -2.65, y: 1.15, rotation: 0, next: [48] },
  { id: 47, type: "PEMAHAMAN", x: -3.25, y: 3, rotation: 0, next: [48] },
  { id: 48, type: "SKIP", x: -4.18, y: 1.7, rotation: 0, next: [49] },
  { id: 49, type: "DASAR", x: -5.2, y: 0.6, rotation: 0, next: [50] },
  { id: 50, type: "PEMAHAMAN", x: -6.2, y: -0.6, rotation: 0, next: [32] },
];

export const TILE_GRAPH = CUSTOM_GRAPH;

// Helper functions
const _tileMap = new Map(TILE_GRAPH.map((t) => [t.id, t]));

export function getTileById(id: number): TileConfig {
  const tile = _tileMap.get(id);
  if (!tile) {
    // Fallback ke ubin 0 jika id di luar batas saat pengembangan
    return TILE_GRAPH[0];
  }
  return tile;
}

export function isForkTile(id: number): boolean {
  return (_tileMap.get(id)?.next.length ?? 0) > 1;
}

export function getTileTypeAt(index: number): TileType {
  return _tileMap.get(index)?.type ?? "DASAR";
}

export const ORNAMENT_DATA = [];


export function getTileColorClasses(type: TileType): string {
  switch (type) {
    case "SKIP": return "bg-white border-slate-200";
    case "STAR": return "bg-yellow-400 border-yellow-300";
    case "TANTANGAN": return "bg-red-500 border-red-400";
    case "PEMAHAMAN": return "bg-orange-500 border-orange-400";
    default: return "bg-blue-500 border-blue-400";
  }
}

export function getCardAccent(type: string) {
  switch (type) {
    case "TANTANGAN":
      return { bg: "bg-red-500", text: "text-red-500", border: "border-red-500/30", glow: "rgba(239,68,68,0.2)" };
    case "PEMAHAMAN":
      return { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500/30", glow: "rgba(249,115,22,0.2)" };
    default:
      return { bg: "bg-[#2c49c5]", text: "text-[#2c49c5]", border: "border-[#2c49c5]/30", glow: "rgba(44,73,197,0.2)" };
  }
}
