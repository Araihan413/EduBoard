/**
 * WorldContainer.tsx
 *
 * Mengemas rendering papan permainan dalam perspektif 3D (Board3D).
 */

"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { Group } from "../../../store/gameStore";

const Board3D = dynamic(() => import("./Board3D"), { ssr: false });

interface WorldContainerProps {
  groups: Group[];
  onMapLoaded?: () => void;
}

export default function WorldContainer({ groups, onMapLoaded }: WorldContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full"
    >
      <Board3D groups={groups} onMapLoaded={onMapLoaded} />
    </motion.div>
  );
}
