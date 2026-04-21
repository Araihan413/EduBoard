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

export default function BoardCanvas({ groups }: BoardCanvasProps) {
  const [tileSize, setTileSize] = useState(70);
  const gap = 10;

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 1280) setTileSize(74);
      else if (width > 1024) setTileSize(64);
      else if (width > 768) setTileSize(54);
      else setTileSize(44);
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
    <div className="relative p-3 lg:p-6 bg-white rounded-[3rem] shadow-2xl border-2 border-slate-50 overflow-hidden">
      {/* Texture Background for the board itself */}
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

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
  const [prevPos, setPrevPos] = useState(group.position);
  const [path, setPath] = useState<{ x: number, y: number }[]>([]);

  const boardSize = 30;

  const getCoords = (pos: number) => {
    if (pos === 0) return startPos;
    const tile = tiles.find(t => t.index === pos);
    return tile ? { x: tile.x, y: tile.y } : startPos;
  };

  if (group.position !== prevPos) {
    const newPath: { x: number, y: number }[] = [];
    const diff = group.position - prevPos;

    if (prevPos === 0) {
      for (let i = 1; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff > 0 && diff <= 6) {
      for (let i = prevPos; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff < 0 && diff >= -6) {
      for (let i = prevPos; i >= group.position; i--) {
        newPath.push(getCoords(i));
      }
    } else if (diff < -6) {
      for (let i = prevPos; i <= boardSize; i++) {
        newPath.push(getCoords(i));
      }
      for (let i = 1; i <= group.position; i++) {
        newPath.push(getCoords(i));
      }
    } else if (diff > 6) {
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
  const scaleValues = path.length > 0 ? path.map((_, i) => i === 0 || i === path.length - 1 ? 1 : 1.4) : [1];

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
        zIndex: 100 + gIdx
      }}
    >
      <div 
        className={`w-5 h-5 lg:w-7 lg:h-7 rounded-full border-4 border-white shadow-2xl ${
          gIdx === 0 ? "bg-[#2c49c5]" : gIdx === 1 ? "bg-red-500" : gIdx === 2 ? "bg-purple-500" : "bg-emerald-500"
        }`}
        title={group.name}
      />
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
