import type { MoveClassification } from "@/types/review";

const ACTIONABLE_CLASSES = new Set<MoveClassification>([
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
]);

export function shouldShowBestMoveHint(
  move: {
    san?: string;
    bestMove?: string;
    classification?: MoveClassification;
  } | null,
): boolean {
  if (!move?.classification || !move.bestMove) return false;
  return (
    ACTIONABLE_CLASSES.has(move.classification) && move.bestMove !== move.san
  );
}
