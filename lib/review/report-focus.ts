import type { MoveClassification } from "@/types/review";
import type { ReviewListMove } from "@/lib/review/review-stats";

const FOCUS_PRIORITY: Partial<Record<MoveClassification, number>> = {
  blunder: 100,
  miss: 90,
  mistake: 80,
  inaccuracy: 70,
  brilliant: 60,
  great: 50,
};

function focusScore(move: ReviewListMove): number {
  return move.classification ? (FOCUS_PRIORITY[move.classification] ?? 0) : 0;
}

export function selectReviewFocusFen(
  moves: ReviewListMove[],
  fallbackFen: string,
): string {
  let selected: ReviewListMove | null = null;
  let selectedScore = 0;

  for (const move of moves) {
    const score = focusScore(move);
    if (score > selectedScore) {
      selected = move;
      selectedScore = score;
    }
  }

  return selected?.fenAfter || fallbackFen;
}
