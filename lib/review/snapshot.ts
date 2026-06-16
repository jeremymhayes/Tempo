import type { ParsedGame } from "@/types/chess";
import type { EngineEvaluation, MoveClassification } from "@/types/review";
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
  bestMove?: string;
  bestMoveUci?: string;
  bestLine?: string[];
  playedBestMove?: boolean;
  onlyMove?: boolean;
  isSacrifice?: boolean;
  evalBefore?: EngineEvaluation;
  evalAfter?: EngineEvaluation;
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
  if (move.bestMove) snapshot.bestMove = move.bestMove;
  if (move.bestMoveUci) snapshot.bestMoveUci = move.bestMoveUci;
  if (move.bestLine?.length) snapshot.bestLine = [...move.bestLine];
  if (typeof move.playedBestMove === "boolean") {
    snapshot.playedBestMove = move.playedBestMove;
  }
  if (typeof move.onlyMove === "boolean") {
    snapshot.onlyMove = move.onlyMove;
  }
  if (typeof move.isSacrifice === "boolean") {
    snapshot.isSacrifice = move.isSacrifice;
  }
  if (move.evalBefore) snapshot.evalBefore = move.evalBefore;
  if (move.evalAfter) snapshot.evalAfter = move.evalAfter;
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

export function createReviewSnapshotFromMoves(
  moves: ReviewListMove[],
): ReviewSnapshot {
  const stats = buildReviewStats(moves);

  return {
    version: 1,
    stats,
    moves: moves.map(toSnapshotMove),
    blunders: countBlunders(moves),
  };
}

export function createReviewSnapshot(game: ParsedGame): ReviewSnapshot {
  const review = createStarterReview(game);
  const moves: ReviewListMove[] = review.moves;
  return createReviewSnapshotFromMoves(moves);
}

export function isReviewSnapshot(value: unknown): value is ReviewSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ReviewSnapshot>;
  return (
    snapshot.version === 1 &&
    Array.isArray(snapshot.moves) &&
    Boolean(snapshot.stats) &&
    typeof snapshot.stats === "object" &&
    typeof snapshot.blunders === "number"
  );
}

export function evalByPlyFromSnapshot(
  snapshot: ReviewSnapshot,
): Record<number, EngineEvaluation> {
  const evalByPly: Record<number, EngineEvaluation> = {};

  for (const move of snapshot.moves) {
    if (move.evalBefore && evalByPly[move.ply - 1] === undefined) {
      evalByPly[move.ply - 1] = move.evalBefore;
    }
    if (move.evalAfter) {
      evalByPly[move.ply] = move.evalAfter;
    }
  }

  return evalByPly;
}

export function reviewSnapshotHasEngineAnalysis(
  snapshot: ReviewSnapshot | null | undefined,
): boolean {
  return Boolean(
    snapshot?.moves.some(
      (move) =>
        Boolean(move.bestMoveUci) ||
        Boolean(move.bestLine?.length) ||
        Boolean(move.evalBefore) ||
        Boolean(move.evalAfter),
    ),
  );
}
