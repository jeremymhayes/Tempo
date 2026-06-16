import type { ParsedGame } from "@/types/chess";
import type { MoveClassification } from "@/types/review";
import { createStarterReview } from "@/lib/review/starter-review";
import {
  buildReviewStats,
  type ReviewListMove,
  type ReviewStats,
} from "@/lib/review/review-stats";

export type ReviewSnapshotMove = {
  ply: number;
  moveNumber: number;
  color: "w" | "b";
  san: string;
  fenBefore: string;
  fenAfter: string;
  classification?: MoveClassification;
  centipawnLoss?: number;
};

export type ReviewSnapshot = {
  version: 1;
  stats: ReviewStats;
  moves: ReviewSnapshotMove[];
  blunders: number;
};

function toSnapshotMove(move: ReviewListMove): ReviewSnapshotMove {
  const snapshot: ReviewSnapshotMove = {
    ply: move.ply,
    moveNumber: move.moveNumber,
    color: move.color,
    san: move.san,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter,
  };
  if (move.classification) snapshot.classification = move.classification;
  if (typeof move.centipawnLoss === "number") {
    snapshot.centipawnLoss = move.centipawnLoss;
  }
  return snapshot;
}

export function countBlunders(moves: ReviewListMove[]): number {
  return moves.filter((move) => move.classification === "blunder").length;
}

export function averageAccuracy(stats: ReviewStats): number | undefined {
  const values = [stats.accuracy.white, stats.accuracy.black].filter(
    (value): value is number => typeof value === "number",
  );
  if (!values.length) return undefined;

  return Math.round(
    (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
  ) / 10;
}

export function createReviewSnapshot(game: ParsedGame): ReviewSnapshot {
  const review = createStarterReview(game);
  const moves: ReviewListMove[] = review.moves;
  const stats = buildReviewStats(moves);

  return {
    version: 1,
    stats,
    moves: moves.map(toSnapshotMove),
    blunders: countBlunders(moves),
  };
}
