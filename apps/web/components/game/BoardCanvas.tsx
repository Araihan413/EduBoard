"use client";

import { Stage, Layer, Rect, Circle } from "react-konva";
import { Group } from "../../store/gameStore";

export default function BoardCanvas({ groups }: { groups: Group[] }) {
  return (
    <Stage width={800} height={600} className="bg-slate-800 rounded-3xl shadow-2xl border-4 border-slate-700/50 overflow-hidden">
      <Layer>
        {/* Dummy Board Path */}
        {Array.from({ length: 15 }).map((_, i) => {
          const x = 50 + (i % 5) * 120;
          const y = 50 + Math.floor(i / 5) * 150;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={100}
              height={100}
              fill={i === 0 ? "#10b981" : i === 14 ? "#f59e0b" : "#1e293b"}
              cornerRadius={16}
              stroke="#334155"
              strokeWidth={4}
            />
          );
        })}

        {/* Dummy Player Tokens */}
        {groups.map((group, index) => {
          const posIndex = Math.min(group.position, 14);
          const baseX = 50 + (posIndex % 5) * 120;
          const baseY = 50 + Math.floor(posIndex / 5) * 150;
          
          const offsets = [
            { dx: 25, dy: 25 },
            { dx: 75, dy: 25 },
            { dx: 50, dy: 75 }
          ];
          
          const color = index === 0 ? "#3b82f6" : index === 1 ? "#ef4444" : "#a855f7";

          return (
            <Circle
              key={group.id}
              x={baseX + offsets[index].dx}
              y={baseY + offsets[index].dy}
              radius={16}
              fill={color}
              shadowColor="black"
              shadowBlur={10}
              shadowOpacity={0.6}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}
