import type { ParsedGame } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import type { AnalysisEngine, AnalyzeOptions } from "@/lib/engine/types";
import { fenSideToMove, toWhitePov } from "@/lib/engine/eval-format";
import { uciLineToSan, uciToSan } from "@/lib/engine/san";
import {
  buildEngineReviewedMoves,
  evalByPlyFromAnalysis,
  REVIEW_ENGINE_DEPTH,
  REVIEW_ENGINE_MULTI_PV,
  REVIEW_ENGINE_SKILL,
  terminalWhiteScore,
  type ReviewAnalysisByPly,
  type ReviewEvalByPly,
  type ReviewPositionAnalysis,
} from "@/lib/review/deep-analysis";

export type ReviewAnalysisProgress = {
  current: number;
  total: number;
  evalByPly: ReviewEvalByPly;
  analysisByPly: ReviewAnalysisByPly;
};

export type ReviewAnalysisResult = ReviewAnalysisProgress & {
  moves: ReviewedMove[];
};

export type AnalyzeGameWithEngineOptions = {
  analyzeOptions?: AnalyzeOptions;
  onProgress?: (progress: ReviewAnalysisProgress) => void;
};

export function getReviewPositions(game: ParsedGame): Array<{
  ply: number;
  fen: string;
}> {
  return [
    { ply: -1, fen: game.initialFen },
    ...game.moves.map((move) => ({ ply: move.ply, fen: move.fenAfter })),
  ];
}

export function defaultReviewAnalyzeOptions(): AnalyzeOptions {
  return {
    depth: REVIEW_ENGINE_DEPTH,
    multiPV: REVIEW_ENGINE_MULTI_PV,
    skill: REVIEW_ENGINE_SKILL,
  };
}

export function analyzeReviewPosition(
  engine: AnalysisEngine,
  fen: string,
  options: AnalyzeOptions,
): Promise<ReviewPositionAnalysis> {
  const terminalScore = terminalWhiteScore(fen);
  if (terminalScore) return Promise.resolve({ score: terminalScore });

  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      engine.analyze(fen, options, (update) => {
        if (!update.done || settled) return;
        const line = update.lines[0];
        if (!line?.score) {
          settled = true;
          reject(new Error("Stockfish did not return an evaluation."));
          return;
        }

        settled = true;
        const sideToMove = fenSideToMove(fen);
        const bestMove = update.bestMove ?? line.pv[0] ?? null;
        resolve({
          score: toWhitePov(line.score, sideToMove),
          bestMove,
          bestMoveSan: bestMove ? uciToSan(fen, bestMove) : null,
          bestLineSan: uciLineToSan(fen, line.pv, 6),
          candidateMoves: update.lines.flatMap((candidate) => {
            const move = candidate.pv[0];
            if (!move) return [];
            return [
              {
                move,
                san: uciToSan(fen, move),
                score: toWhitePov(candidate.score, sideToMove),
                depth: candidate.depth,
              },
            ];
          }),
          depth: update.depth,
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function analyzeGameWithEngine(
  game: ParsedGame,
  engine: AnalysisEngine,
  options: AnalyzeGameWithEngineOptions = {},
): Promise<ReviewAnalysisResult> {
  const positions = getReviewPositions(game);
  const analyzeOptions = options.analyzeOptions ?? defaultReviewAnalyzeOptions();
  const analysisByPly: ReviewAnalysisByPly = {};

  for (const [index, position] of positions.entries()) {
    analysisByPly[position.ply] = await analyzeReviewPosition(
      engine,
      position.fen,
      analyzeOptions,
    );

    const progress = {
      current: index + 1,
      total: positions.length,
      evalByPly: evalByPlyFromAnalysis(analysisByPly),
      analysisByPly: { ...analysisByPly },
    };
    options.onProgress?.(progress);
  }

  const evalByPly = evalByPlyFromAnalysis(analysisByPly);
  return {
    current: positions.length,
    total: positions.length,
    evalByPly,
    analysisByPly,
    moves: buildEngineReviewedMoves(game.moves, evalByPly, {
      analysisByPly,
    }),
  };
}
