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
    case "DASAR": return <BookOpen className="w-6 h-6 text-blue-50" />;
    case "AKSI": return <Target className="w-6 h-6 text-red-50" />;
    case "TANTANGAN": return <Flame className="w-6 h-6 text-orange-50" />;
    case "SKIP": return <Moon className="w-6 h-6 text-zinc-500" />;
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
  const gap = 8;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1280) setTileSize(70);
      else if (width > 1024) setTileSize(60);
      else if (width > 768) setTileSize(50);
      else setTileSize(40);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Tile Path Definition (30 tiles: 11 Top, 4 Right, 11 Bottom, 4 Left)
  const tiles: TileInfo[] = [];
  
  // Top row (1-11)
  for (let i = 1; i <= 11; i++) {
    tiles.push({ index: i, type: getTileTypeAt(i), x: i - 1, y: 0 });
  }
  // Right col (12-15)
  for (let i = 1; i <= 4; i++) {
    tiles.push({ index: 11 + i, type: getTileTypeAt(11 + i), x: 10, y: i });
  }
  // Bottom row (16-26)
  for (let i = 0; i <= 10; i++) {
    tiles.push({ index: 16 + i, type: getTileTypeAt(16 + i), x: 10 - i, y: 5 });
  }
  // Left col (27-30)
  for (let i = 1; i <= 4; i++) {
    tiles.push({ index: 26 + i, type: getTileTypeAt(26 + i), x: 0, y: 5 - i });
  }

  // Pre-calculate coordinate for Starting Zone (Position 0)
  // Positioned to the left of the dice (inner area)
  const startPos = { x: 1, y: 1 };

  return (
    <div className="relative p-2 lg:p-4 bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl border-4 lg:border-8 border-zinc-100 dark:border-zinc-900 overflow-hidden">
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
            className={`relative flex items-center justify-center rounded-lg lg:rounded-xl border transition-colors duration-300 ${getTileColor(tile.type)}`}
            style={{
              gridColumnStart: tile.x + 1,
              gridRowStart: tile.y + 1,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
            }}
          >
            <div className={`flex items-center justify-center ${tile.type !== "SKIP" ? "text-white" : ""}`}>
              <div className="scale-75 lg:scale-100">
                {getTileIcon(tile.type)}
              </div>
            </div>
            <span className="absolute bottom-0.5 right-0.5 lg:bottom-1 lg:right-1 text-[6px] lg:text-[8px] font-bold opacity-30">
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
          className="relative flex items-center justify-center rounded-lg lg:rounded-xl border-2 border-emerald-400 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] pointer-events-none"
          style={{
            gridColumnStart: startPos.x + 1,
            gridRowStart: startPos.y + 1,
            width: `${tileSize}px`,
            height: `${tileSize}px`,
          }}
        >
          <span className="text-[10px] lg:text-xs font-black text-white italic tracking-tighter">START</span>
        </div>

        {/* Center Decorations (Dice area) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-6 flex flex-col items-center justify-center pointer-events-none opacity-10 dark:opacity-5">
           <div className="scale-50 lg:scale-100 transition-transform">
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
  const [prevPos, setPrevPos] = useState(group.position);
  const [path, setPath] = useState<{ x: number, y: number }[]>([]);

  // Board Size
  const boardSize = 30;

  // Helper to get coords
  const getCoords = (pos: number) => {
    if (pos === 0) return startPos;
    const tile = tiles.find(t => t.index === pos);
    return tile ? { x: tile.x, y: tile.y } : startPos;
  };

  if (group.position !== prevPos) {
    const newPath: { x: number, y: number }[] = [];
    const diff = group.position - prevPos;

    // Movement Path Generation
    if (prevPos === 0) {
      // First move from center
      for (let i = 1; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff > 0 && diff <= 6) {
      // Normal forward move
      for (let i = prevPos; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff < 0 && diff >= -6) {
      // Normal backward move
      for (let i = prevPos; i >= group.position; i--) {
        newPath.push(getCoords(i));
      }
    } else if (diff < -6) {
      // Forward wrap-around (e.g. 29 -> 2)
      for (let i = prevPos; i <= boardSize; i++) {
        newPath.push(getCoords(i));
      }
      for (let i = 1; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff > 6) {
      // Backward wrap-around (e.g. 1 -> 28)
      for (let i = prevPos; i >= 1; i--) {
        newPath.push(getCoords(i));
      }
      for (let i = boardSize; i >= group.position; i--) {
        newPath.push(getCoords(i));
      }
    }
    
    setPath(newPath);
    setPrevPos(group.position);
  }

  const currentPos = getCoords(group.position);

  const xCoords = path.length > 0 ? path.map(t => t.x * (tileSize + gap)) : [currentPos.x * (tileSize + gap)];
  const yCoords = path.length > 0 ? path.map(t => t.y * (tileSize + gap)) : [currentPos.y * (tileSize + gap)];
  // Create arc effect by modifying scale or y offset slightly during middle of jump
  const scaleValues = path.length > 0 ? path.map((_, i) => i === 0 || i === path.length - 1 ? 1 : 1.3) : [1];

  return (
    <motion.div
      initial={false}
      animate={path.length > 1 ? {
        x: xCoords,
        y: yCoords,
        scale: scaleValues,
      } : {
        x: currentPos.x * (tileSize + gap),
        y: currentPos.y * (tileSize + gap),
        scale: 1
      }}
      transition={{
        duration: path.length > 1 ? (path.length - 1) * 0.4 : 0.4,
        ease: "easeInOut",
        times: path.length > 1 ? path.map((_, i) => i / (path.length - 1)) : [0, 1]
      }}
      style={{
        width: tileSize,
        height: tileSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 50 + gIdx
      }}
    >
      <div 
        className={`w-4 h-4 lg:w-6 lg:h-6 rounded-full border-2 border-white dark:border-zinc-950 shadow-lg ${
          gIdx === 0 ? "bg-blue-500" : gIdx === 1 ? "bg-red-500" : gIdx === 2 ? "bg-purple-500" : "bg-emerald-500"
        }`}
        title={group.name}
      />
    </motion.div>
  );
}

function DiscIllustration() {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center grayscale opacity-50">
       <svg viewBox="0 0 200 200" className="w-full h-full text-zinc-400">
         <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
         <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
       </svg>
     </div>
  );
}
