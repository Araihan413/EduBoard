/**
 * WorldContainer.tsx
 *
 * Responsible for rendering the game board in 3D perspective and switching
 * between the 2D and 3D implementation.
 *
 * To switch to 3D:
 *   Change `USE_3D` to `true` (or drive it from an env variable / feature flag).
 */

"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { Group } from "../../../store/gameStore";

const Board2D = dynamic(() => import("./Board2D"), { ssr: false });
const Board3D = dynamic(() => import("./Board3D"), { ssr: false });

// ─── Feature Flag ─────────────────────────────────────────────────────────────

/** Set to `true` to enable the 3D board. */
const USE_3D = true;

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorldContainerProps {
  groups: Group[];
}

// ─── WorldContainer ───────────────────────────────────────────────────────────

export default function WorldContainer({ groups }: WorldContainerProps) {
  const Board = USE_3D ? Board3D : Board2D;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full h-full"
    >
      <Board groups={groups} />
    </motion.div>
  );
}
