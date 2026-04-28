"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Target, Flame, Moon } from "lucide-react";
import { Group, QuestionType, getTileTypeAt } from "../../store/gameStore";

interface BoardCanvasProps {
  groups: Group[];
}

interface TileInfo {
  index: number;
  type: QuestionType | "SKIP";
  x: number;
  y: number;
}

const getTileIcon = (type: string) => {
  switch (type) {
    case "DASAR": return <BookOpen className="w-8 h-8 text-blue-50/40" />;
    case "AKSI": return <Target className="w-8 h-8 text-red-50/40" />;
    case "TANTANGAN": return <Flame className="w-8 h-8 text-orange-50/40" />;
    case "SKIP": return <Moon className="w-8 h-8 text-slate-200" />;
    default: return null;
  }
};

const getTileColor = (type: string) => {
  switch (type) {
    case "SKIP": return "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700";
    case "AKSI": return "bg-red-500 dark:bg-red-600 border-red-400 dark:border-red-500";
    case "TANTANGAN": return "bg-orange-500 dark:bg-orange-600 border-orange-400 dark:border-orange-500";
    default: return "bg-blue-500 dark:bg-blue-600 border-blue-400 dark:border-blue-500";
  }
};

export default function BoardCanvas({ groups }: BoardCanvasProps) {
  const [tileSize, setTileSize] = useState(70);
  const gap = 10;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1280) setTileSize(82);
      else if (width > 1024) setTileSize(72);
      else if (width > 768) setTileSize(58);
      else setTileSize(48);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const tiles: TileInfo[] = [];
  
  for (let i = 1; i <= 11; i++) {
    tiles.push({ index: i, type: getTileTypeAt(i), x: i - 1, y: 0 });
  }
  for (let i = 1; i <= 4; i++) {
    tiles.push({ index: 11 + i, type: getTileTypeAt(11 + i), x: 10, y: i });
  }
  for (let i = 0; i <= 10; i++) {
    tiles.push({ index: 16 + i, type: getTileTypeAt(16 + i), x: 10 - i, y: 5 });
  }
  for (let i = 1; i <= 4; i++) {
    tiles.push({ index: 26 + i, type: getTileTypeAt(26 + i), x: 0, y: 5 - i });
  }

  const startPos = { x: 1, y: 1 };

  return (
    <div className="relative p-6 bg-[#f8fafc] rounded-[3rem] shadow-[0_0_0_12px_#ffffff,0_0_0_14px_#e2e8f0,0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* 1. BOARD SURFACE TEXTURE */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')]" />
      
      {/* 2. PHYSICAL FOLDING SEAMS (Lipatan Papan) */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-1/2 h-full border-r border-black/[0.03] shadow-[1px_0_0_rgba(255,255,255,0.5)]" />
        <div className="w-full h-1/2 absolute top-0 border-b border-black/[0.03] shadow-[0_1px_0_rgba(255,255,255,0.5)]" />
      </div>

      {/* 3. BOARD INNER BEVEL (Efek Kedalaman Pinggiran) */}
      <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_4px_12px_rgba(0,0,0,0.05),inset_0_-4px_12px_rgba(255,255,255,0.8)] pointer-events-none" />

      <div 
        className="relative grid" 
        style={{ 
          gap: `${gap}px`,
          gridTemplateColumns: `repeat(11, ${tileSize}px)`, 
          gridTemplateRows: `repeat(6, ${tileSize}px)` 
        }}
      >
        {/* Render Background Tiles */}
        {tiles.map((tile) => (
          <div
            key={tile.index}
            className={`relative flex items-center justify-center rounded-2xl lg:rounded-[1.5rem] border-2 transition-all duration-300 shadow-sm ${getTileColor(tile.type)}`}
            style={{
              gridColumnStart: tile.x + 1,
              gridRowStart: tile.y + 1,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
            }}
          >
            <div className={`flex items-center justify-center ${tile.type !== "SKIP" ? "text-white" : "text-slate-400"}`}>
              <div className="scale-75 lg:scale-100 filter drop-shadow-md">
                {getTileIcon(tile.type)}
              </div>
            </div>
            <span className="absolute bottom-1 right-1 lg:bottom-2 lg:right-2 text-[7px] lg:text-[10px] font-black opacity-20">
              {tile.index}
            </span>
          </div>
        ))}

        {/* Render Animated Pions Layer */}
        <div className="absolute inset-0 pointer-events-none" style={{ display: 'grid', gridTemplateColumns: `repeat(11, ${tileSize}px)`, gridTemplateRows: `repeat(6, ${tileSize}px)`, gap: `${gap}px` }}>
          {groups.map((group, gIdx) => (
            <PlayerPion 
              key={group.id} 
              group={group} 
              gIdx={gIdx} 
              tiles={tiles}
              tileSize={tileSize}
              gap={gap}
              startPos={startPos}
            />
          ))}
        </div>

        {/* Starting Area Tile (Position 0) */}
        <div 
          className="relative flex items-center justify-center rounded-2xl lg:rounded-[1.5rem] border-4 border-white bg-emerald-500 shadow-xl shadow-emerald-500/20 pointer-events-none z-10"
          style={{
            gridColumnStart: startPos.x + 1,
            gridRowStart: startPos.y + 1,
            width: `${tileSize}px`,
            height: `${tileSize}px`,
          }}
        >
          <span className="text-[10px] lg:text-xs font-black text-white italic tracking-tighter uppercase">START</span>
        </div>

        {/* Center Decorations */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-6 flex flex-col items-center justify-center pointer-events-none opacity-20">
           <div className="scale-50 lg:scale-110 transition-transform">
             <DiscIllustration />
           </div>
        </div>
      </div>
    </div>
  );
}

function PlayerPion({ group, gIdx, tiles, tileSize, gap, startPos }: { 
  group: Group, 
  gIdx: number, 
  tiles: TileInfo[], 
  tileSize: number, 
  gap: number,
  startPos: { x: number, y: number }
}) {
  const [restPos, setRestPos] = useState(group.position);
  const boardSize = 30;

  const getCoords = (pos: number) => {
    if (pos === 0) return startPos;
    const tile = tiles.find(t => t.index === pos);
    return tile ? { x: tile.x, y: tile.y } : startPos;
  };

  // derived state: hitung path secara langsung saat render
  const isMoving = group.position !== restPos;
  const currentPath: { x: number, y: number }[] = [];

  if (isMoving) {
    const prev = restPos;
    const next = group.position;
    const diff = next - prev;

    if (prev === 0) {
      for (let i = 1; i <= next; i++) currentPath.push(getCoords(i));
    } else if (diff > 0 && diff <= 6) {
      for (let i = prev; i <= next; i++) currentPath.push(getCoords(i));
    } else if (diff < 0 && diff >= -6) {
      for (let i = prev; i >= next; i--) currentPath.push(getCoords(i));
    } else if (diff < -6) {
      for (let i = prev; i <= boardSize; i++) currentPath.push(getCoords(i));
      for (let i = 1; i <= next; i++) currentPath.push(getCoords(i));
    } else if (diff > 6) {
      for (let i = prev; i >= 1; i--) currentPath.push(getCoords(i));
      for (let i = boardSize; i >= next; i--) currentPath.push(getCoords(i));
    }
  }

  // When path animation completes, commit the new rest position
  const handleAnimationComplete = () => {
    setRestPos(group.position);
  };

  const restCoords = getCoords(restPos);
  const xCoords = currentPath.length > 1 ? currentPath.map(t => t.x * (tileSize + gap)) : [restCoords.x * (tileSize + gap)];
  const yCoords = currentPath.length > 1 ? currentPath.map(t => t.y * (tileSize + gap)) : [restCoords.y * (tileSize + gap)];
  const scaleValues = currentPath.length > 1 ? currentPath.map((_, i) => i === 0 || i === currentPath.length - 1 ? 1 : 1.4) : [1];

  return (
    <motion.div
      initial={false}
      animate={currentPath.length > 1 ? {
        x: xCoords,
        y: yCoords,
        scale: scaleValues,
      } : {
        x: restCoords.x * (tileSize + gap),
        y: restCoords.y * (tileSize + gap),
        scale: 1
      }}
      transition={{
        duration: currentPath.length > 1 ? (currentPath.length - 1) * 0.4 : 0.4,
        ease: "easeInOut",
        times: currentPath.length > 1 ? currentPath.map((_, i) => i / (currentPath.length - 1)) : undefined
      }}
      onAnimationComplete={handleAnimationComplete}
      style={{
        width: tileSize,
        height: tileSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 100 + gIdx
      }}
    >
      <div className="relative group">
        {/* Real-time Glow Aura */}
        <div 
          className="absolute inset-[-8px] rounded-full blur-xl opacity-40 animate-pulse"
          style={{ backgroundColor: group.color || '#3b82f6' }}
        />
        
        {/* The 3D Token Body */}
        <div 
          className="w-7 h-7 lg:w-9 lg:h-9 rounded-full relative z-10 border-2 border-white/50 shadow-[0_4px_10px_rgba(0,0,0,0.3),inset_0_-4px_6px_rgba(0,0,0,0.2)] transition-transform duration-500"
          style={{ background: `linear-gradient(135deg, white 0%, ${group.color || '#3b82f6'} 100%)` }}
        >
          {/* Glossy Reflection Overlay */}
          <div className="absolute top-1 left-1.5 w-1/2 h-1/3 bg-white/30 rounded-full blur-[1px]" />
          
          {/* Center Indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-inner" />
          </div>
        </div>

        {/* Drop Shadow on the board */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/30 blur-sm rounded-full" />
      </div>
    </motion.div>
  );
}

function DiscIllustration() {
  return (
    <div className="relative w-72 h-72 flex items-center justify-center opacity-40">
       <svg viewBox="0 0 200 200" className="w-full h-full text-[#2c49c5]/10">
         <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8 8" />
         <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.5" />
         <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
       </svg>
       <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-[#2c49c5]/5" />
       </div>
    </div>
  );
}
