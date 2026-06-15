// Types for engine-backed analysis. None of this is computed yet — the review
// page renders placeholders. When the Stockfish backend lands it will populate
// `ReviewedMove` / `ReviewSummary` and the UI will light up automatically.

import type { GameMove } from "./chess";

/**
 * How a move is graded relative to the engine's best line.
 * Ordering roughly follows common chess GUIs.
 */
export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

/**
 * A single engine score for a position.
 * `type: "cp"` -> `value` is centipawns from White's perspective.
 * `type: "mate"` -> `value` is moves-to-mate (sign = side mating).
 */
export interface EngineEvaluation {
  type: "cp" | "mate";
  value: number;
  /** Search depth that produced the score, when known. */
  depth?: number;
}

/**
 * A game move enriched with engine analysis. All analysis fields are optional
 * so the UI can render a move before the backend has graded it.
 */
export interface ReviewedMove extends GameMove {
  /** Engine's preferred move in SAN, if different from what was played. */
  bestMove?: string;
  evalBefore?: EngineEvaluation;
  evalAfter?: EngineEvaluation;
  /** Centipawns lost versus the best move (>= 0). */
  centipawnLoss?: number;
  classification?: MoveClassification;
}

/**
 * Aggregate analysis for a whole game.
 */
export interface ReviewSummary {
  /** Per-side accuracy as a percentage (0–100). */
  accuracy: { white?: number; black?: number };
  /** Count of each classification, per side. */
  classifications: {
    white: Partial<Record<MoveClassification, number>>;
    black: Partial<Record<MoveClassification, number>>;
  };
}
