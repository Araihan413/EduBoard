/**
 * Board2D.tsx
 *
 * Visualisasi papan permainan dalam 2D (Grid).
 * Menggunakan data dari TILE_GRAPH di gameConfig.ts.
 */

"use client";

import { motion } from "framer-motion";
import { BookOpen, Target, Flame, Moon, Star } from "lucide-react";
import { Group } from "../../../store/gameStore";
import {
  TILE_GRAPH,
  getTileColorClasses,
  type TileConfig,
} from "../config/gameConfig";

interface Board2DProps {
  groups: Group[];
}

export default function Board2D({ groups }: Board2DProps) {
  return (
    <div className="relative w-full h-full bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/50 shadow-inner overflow-hidden p-8">
      {/* Grid Map */}
      <div 
        className="grid gap-2 w-full h-full"
        style={{ 
          gridTemplateColumns: `repeat(12, 1fr)`,
          gridTemplateRows: `repeat(9, 1fr)` 
        }}
      >
        {TILE_GRAPH.map((tile) => {
          const groupsAtTile = groups.filter((g) => g.position === tile.id);
          const isStart = tile.id === 0;

          return (
            <div
              key={tile.id}
              style={{
                gridColumnStart: tile.x + 1,
                gridRowStart: tile.y + 1,
              }}
              className="relative"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full h-full rounded-2xl border-b-4 flex flex-col items-center justify-center relative transition-all ${getTileColorClasses(tile.type)}`}
              >
                {/* Tile Icon/Content */}
                <div className="opacity-40">
                  {tile.type === "TANTANGAN" && <Flame className="w-5 h-5 text-white" />}
                  {tile.type === "PEMAHAMAN" && <BookOpen className="w-5 h-5 text-white" />}
                  {tile.type === "DASAR" && <Target className="w-5 h-5 text-white" />}
                  {tile.type === "SKIP" && <Moon className="w-5 h-5 text-slate-400" />}
                  {tile.type === "STAR" && <Star className="w-5 h-5 text-yellow-600 animate-pulse" />}
                </div>

                {isStart && (
                  <span className="text-[10px] font-black text-blue-800 uppercase tracking-tighter absolute top-1">
                    START
                  </span>
                )}

                <span className={`text-[10px] font-bold mt-1 ${tile.type === "SKIP" ? "text-slate-400" : "text-white/60"}`}>
                  {tile.id}
                </span>

                {/* Pawns (Pion Pemain) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-wrap items-center justify-center gap-1 p-1">
                    {groupsAtTile.map((group, idx) => (
                      <motion.div
                        key={group.id}
                        layoutId={`pion-${group.id}`}
                        initial={{ scale: 0, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
                        style={{ backgroundColor: group.color || "#3b82f6" }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
