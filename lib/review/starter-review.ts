import type { ParsedGame, PieceColor } from "@/types/chess";
import type {
  MoveClassification,
  ReviewSummary,
  ReviewedMove,
} from "@/types/review";

type ReviewResult = {
  moves: ReviewedMove[];
  summary: ReviewSummary;
};

const CLASSIFICATION_SCORE: Record<MoveClassification, number> = {
  brilliant: 98,
  great: 92,
  best: 88,
  good: 82,
  book: 90,
  inaccuracy: 68,
  mistake: 45,
  blunder: 18,
};

function classifyMove(move: ReviewedMove): MoveClassification {
  if (move.san.includes("#")) return "great";
  if (move.ply < 8) return "book";
  if (move.san.includes("O-O")) return "great";
  if (move.san.includes("+")) return "best";
  if (move.captured || move.san.includes("x")) return "good";

  return "good";
}

function sideKey(color: PieceColor): "white" | "black" {
  return color === "w" ? "white" : "black";
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function createStarterReview(game: ParsedGame): ReviewResult {
  const scores = {
    white: [] as number[],
    black: [] as number[],
  };
  const classifications: ReviewSummary["classifications"] = {
    white: {},
    black: {},
  };

  const moves = game.moves.map((move) => {
    const reviewedMove: ReviewedMove = { ...move };
    const classification = classifyMove(reviewedMove);
    const side = sideKey(move.color);

    reviewedMove.classification = classification;
    classifications[side][classification] =
      (classifications[side][classification] ?? 0) + 1;
    scores[side].push(CLASSIFICATION_SCORE[classification]);

    return reviewedMove;
  });

  return {
    moves,
    summary: {
      accuracy: {
        white: average(scores.white),
        black: average(scores.black),
      },
      classifications,
    },
  };
}
