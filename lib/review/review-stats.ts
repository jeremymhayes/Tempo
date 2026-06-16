import type { GameMove } from "@/types/chess";
import type { MoveClassification } from "@/types/review";

export type ReviewListMove = GameMove & {
  classification?: MoveClassification;
  centipawnLoss?: number;
};

export type MovePair = {
  moveNumber: number;
  white?: ReviewListMove;
  black?: ReviewListMove;
};

export type ReviewStats = {
  counts: {
    white: Partial<Record<MoveClassification, number>>;
    black: Partial<Record<MoveClassification, number>>;
  };
  accuracy: {
    white?: number;
    black?: number;
  };
  rating: {
    white?: number;
    black?: number;
  };
};

const CLASSIFICATION_SCORE: Record<MoveClassification, number> = {
  brilliant: 98,
  great: 92,
  best: 88,
  good: 82,
  book: 90,
  inaccuracy: 68,
  miss: 35,
  mistake: 45,
  blunder: 18,
};

const MOVE_ICON_CLASSES = new Set<MoveClassification>([
  "brilliant",
  "great",
  "mistake",
  "blunder",
]);

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return roundOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function estimateGameRating(accuracy?: number): number | undefined {
  if (typeof accuracy !== "number") return undefined;
  return Math.round(600 + accuracy * 12);
}

export function shouldShowMoveIcon(
  classification?: MoveClassification,
): boolean {
  return classification ? MOVE_ICON_CLASSES.has(classification) : false;
}

export function toMovePairs(moves: ReviewListMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (const move of moves) {
    const last = pairs[pairs.length - 1];
    if (move.color === "w" || !last || last.black) {
      pairs.push({ moveNumber: move.moveNumber });
    }
    const target = pairs[pairs.length - 1];
    if (move.color === "w") target.white = move;
    else target.black = move;
  }
  return pairs;
}

export function buildReviewStats(moves: ReviewListMove[]): ReviewStats {
  const scores = { white: [] as number[], black: [] as number[] };
  const counts: ReviewStats["counts"] = { white: {}, black: {} };

  for (const move of moves) {
    if (!move.classification) continue;
    const side = move.color === "w" ? "white" : "black";
    counts[side][move.classification] =
      (counts[side][move.classification] ?? 0) + 1;
    scores[side].push(CLASSIFICATION_SCORE[move.classification]);
  }

  const whiteAccuracy = average(scores.white);
  const blackAccuracy = average(scores.black);

  return {
    counts,
    accuracy: {
      white: whiteAccuracy,
      black: blackAccuracy,
    },
    rating: {
      white: estimateGameRating(whiteAccuracy),
      black: estimateGameRating(blackAccuracy),
    },
  };
}
