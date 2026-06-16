import { Chess, type Square } from "chess.js";
import type { GameMove } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import { fenSideToMove, type WhiteScore } from "@/lib/engine/eval-format";
import {
  centipawnLoss,
  classifyEngineMove,
  winChanceLoss,
} from "@/lib/engine/classify";

export const REVIEW_ENGINE_DEPTH = 16;
export const REVIEW_ENGINE_SKILL = 20;
export const REVIEW_ENGINE_MULTI_PV = 3;
export const REVIEW_MOVE_VISIBLE_ROWS = 10;
export const REVIEW_MOVE_ROW_HEIGHT_PX = 36;

export type ReviewEvalByPly = Record<number, WhiteScore>;
export type ReviewCandidateMove = {
  move: string;
  san?: string | null;
  score: WhiteScore;
  depth?: number;
};
export type ReviewPositionAnalysis = {
  score: WhiteScore;
  bestMove?: string | null;
  bestMoveSan?: string | null;
  bestLineSan?: readonly string[];
  candidateMoves?: readonly ReviewCandidateMove[];
  depth?: number;
};
export type ReviewAnalysisByPly = Record<number, ReviewPositionAnalysis>;
export type BuildEngineReviewedMovesOptions = {
  bookLastPly?: number | null;
  analysisByPly?: ReviewAnalysisByPly;
};

function normalizeUci(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

const EQUIVALENT_BEST_LOSS = 10;
const ONLY_MOVE_MIN_CENTIPAWN_LOSS = 150;
const ONLY_MOVE_MIN_WIN_CHANCE_LOSS = 8;

function findPlayedCandidate(
  move: GameMove,
  analysis?: ReviewPositionAnalysis,
): ReviewCandidateMove | undefined {
  const played = normalizeUci(move.lan);
  if (!played) return undefined;
  return analysis?.candidateMoves?.find(
    (entry) => normalizeUci(entry.move) === played,
  );
}

function isPlayedBestMove(
  move: GameMove,
  analysis?: ReviewPositionAnalysis,
): boolean | undefined {
  const played = normalizeUci(move.lan);
  if (!played) return undefined;
  if (!analysis) return undefined;

  const best = normalizeUci(analysis.bestMove);
  if (best && played === best) return true;

  const candidate = findPlayedCandidate(move, analysis);
  if (candidate) {
    return (
      centipawnLoss(analysis.score, candidate.score, move.color) <=
      EQUIVALENT_BEST_LOSS
    );
  }

  return best ? false : undefined;
}

function isOnlyMove(
  move: GameMove,
  analysis: ReviewPositionAnalysis | undefined,
  playedBestMove: boolean | undefined,
): boolean | undefined {
  if (!analysis?.candidateMoves || analysis.candidateMoves.length < 2) {
    return undefined;
  }
  if (playedBestMove !== true) return false;

  const played = normalizeUci(move.lan);
  const alternatives = analysis.candidateMoves.filter(
    (entry) => normalizeUci(entry.move) !== played,
  );
  if (!alternatives.length) return undefined;

  return alternatives.every((candidate) => {
    const loss = centipawnLoss(analysis.score, candidate.score, move.color);
    const practicalLoss = winChanceLoss(
      analysis.score,
      candidate.score,
      move.color,
    );
    return (
      loss >= ONLY_MOVE_MIN_CENTIPAWN_LOSS ||
      practicalLoss >= ONLY_MOVE_MIN_WIN_CHANCE_LOSS
    );
  });
}

export function evalByPlyFromAnalysis(
  analysisByPly: ReviewAnalysisByPly,
): ReviewEvalByPly {
  return Object.fromEntries(
    Object.entries(analysisByPly).map(([ply, analysis]) => [
      Number(ply),
      analysis.score,
    ]),
  );
}

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

function pieceValue(piece?: string): number {
  return PIECE_VALUE[piece?.toLowerCase() ?? ""] ?? 0;
}

function toSquare(value: string): Square | null {
  return /^[a-h][1-8]$/.test(value) ? (value as Square) : null;
}

function isLikelySacrifice(move: GameMove): boolean {
  if (!move.fenAfter || !move.to) return false;
  const target = toSquare(move.to);
  if (!target) return false;

  try {
    const chess = new Chess(move.fenAfter);
    const movedPiece = chess.get(target);
    if (!movedPiece || movedPiece.color !== move.color || movedPiece.type === "k") {
      return false;
    }

    const opponent = move.color === "w" ? "b" : "w";
    if (!chess.isAttacked(target, opponent)) return false;

    return pieceValue(movedPiece.type) > pieceValue(move.captured);
  } catch {
    return false;
  }
}

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
  options: BuildEngineReviewedMovesOptions = {},
): ReviewedMove[] {
  return moves.map((move) => {
    const beforeAnalysis = options.analysisByPly?.[move.ply - 1];
    const afterAnalysis = options.analysisByPly?.[move.ply];
    const evalBefore = beforeAnalysis?.score ?? evalByPly[move.ply - 1];
    const evalAfter = afterAnalysis?.score ?? evalByPly[move.ply];
    if (!evalBefore || !evalAfter) return { ...move };

    const playedCandidate = findPlayedCandidate(move, beforeAnalysis);
    const classificationEvalAfter = playedCandidate?.score ?? evalAfter;
    const loss = centipawnLoss(evalBefore, classificationEvalAfter, move.color);
    const book =
      typeof options.bookLastPly === "number" &&
      move.ply <= options.bookLastPly;
    const playedBestMove = isPlayedBestMove(move, beforeAnalysis);
    const onlyMove = isOnlyMove(move, beforeAnalysis, playedBestMove);
    const isSacrifice = isLikelySacrifice(move);

    return {
      ...move,
      bestMove: beforeAnalysis?.bestMoveSan ?? undefined,
      bestMoveUci: beforeAnalysis?.bestMove ?? undefined,
      bestLine: beforeAnalysis?.bestLineSan
        ? [...beforeAnalysis.bestLineSan]
        : undefined,
      playedBestMove,
      onlyMove,
      isSacrifice,
      evalBefore,
      evalAfter: classificationEvalAfter,
      centipawnLoss: loss,
      classification: classifyEngineMove({
        before: evalBefore,
        after: classificationEvalAfter,
        mover: move.color,
        book,
        san: move.san,
        captured: Boolean(move.captured),
        playedBestMove,
        onlyMove,
        sacrifice: isSacrifice,
      }),
    };
  });
}
