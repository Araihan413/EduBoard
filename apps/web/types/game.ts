/**
 * game.ts — Shared primitive types for the game domain.
 *
 * Kept here (not in gameStore.ts) so that config/engine modules
 * can import types without creating circular dependencies.
 */

export type GroupStatus  = "ACTIVE" | "SKIP_NEXT" | "WAITING" | "SURRENDERED";
export type GameStatus   = "IDLE" | "LOBBY" | "PLAYING" | "FINISHED";
export type QuestionType = "DASAR" | "TANTANGAN" | "PEMAHAMAN";

/** Tile types on the board. STAR = fork/intersection tile. */
export type TileType = QuestionType | "SKIP" | "STAR";
