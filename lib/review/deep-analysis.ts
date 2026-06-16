import { Chess } from "chess.js";
import type { GameMove } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import { fenSideToMove, type WhiteScore } from "@/lib/engine/eval-format";
import { centipawnLoss, classifyLoss } from "@/lib/engine/classify";

export const REVIEW_ENGINE_DEPTH = 16;
export const REVIEW_ENGINE_SKILL = 20;
export const REVIEW_MOVE_VISIBLE_ROWS = 10;
export const REVIEW_MOVE_ROW_HEIGHT_PX = 36;

export type ReviewEvalByPly = Record<number, WhiteScore>;

export function terminalWhiteScore(fen: string): WhiteScore | null {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    return {
      type: "mate",
      value: fenSideToMove(fen) === "b" ? 1 : -1,
    };
  }
  if (chess.isDraw()) return { type: "cp", value: 0 };
  return null;
}

export function buildEngineReviewedMoves(
  moves: GameMove[],
  evalByPly: ReviewEvalByPly,
): ReviewedMove[] {
  return moves.map((move) => {
    const evalBefore = evalByPly[move.ply - 1];
    const evalAfter = evalByPly[move.ply];
    if (!evalBefore || !evalAfter) return { ...move };

    const loss = centipawnLoss(evalBefore, evalAfter, move.color);
    return {
      ...move,
      evalBefore,
      evalAfter,
      centipawnLoss: loss,
      classification: classifyLoss(loss),
    };
  });
}
