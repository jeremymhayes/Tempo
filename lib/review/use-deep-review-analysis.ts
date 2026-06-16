"use client";

import { useEffect, useMemo, useState } from "react";
import type { ParsedGame } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import type { AnalysisEngine, AnalyzeOptions } from "@/lib/engine/types";
import { createEngine } from "@/lib/engine";
import {
  fenSideToMove,
  toWhitePov,
} from "@/lib/engine/eval-format";
import {
  buildEngineReviewedMoves,
  evalByPlyFromAnalysis,
  REVIEW_ENGINE_DEPTH,
  REVIEW_ENGINE_MULTI_PV,
  REVIEW_ENGINE_SKILL,
  terminalWhiteScore,
  type ReviewAnalysisByPly,
  type ReviewPositionAnalysis,
  type ReviewEvalByPly,
} from "@/lib/review/deep-analysis";
import { uciLineToSan, uciToSan } from "@/lib/engine/san";

type ReviewAnalysisStatus =
  | "idle"
  | "loading-engine"
  | "analyzing"
  | "ready"
  | "error";

export type DeepReviewAnalysisState = {
  status: ReviewAnalysisStatus;
  current: number;
  total: number;
  evalByPly: ReviewEvalByPly;
  analysisByPly: ReviewAnalysisByPly;
  moves: ReviewedMove[];
  error: string | null;
};

const INITIAL_STATE: DeepReviewAnalysisState = {
  status: "idle",
  current: 0,
  total: 0,
  evalByPly: {},
  analysisByPly: {},
  moves: [],
  error: null,
};

function analyzePosition(
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

export function useDeepReviewAnalysis(game: ParsedGame | null) {
  const [state, setState] = useState<DeepReviewAnalysisState>(INITIAL_STATE);

  useEffect(() => {
    if (!game) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(INITIAL_STATE);
      return;
    }

    const targetGame = game;
    let cancelled = false;
    let engine: AnalysisEngine | null = null;
    const positions = [
      { ply: -1, fen: targetGame.initialFen },
      ...targetGame.moves.map((move) => ({ ply: move.ply, fen: move.fenAfter })),
    ];

    async function run() {
      setState({
        ...INITIAL_STATE,
        status: "loading-engine",
        total: positions.length,
      });

      try {
        engine = createEngine("stockfish");
        await engine.init();
        if (cancelled) return;

        const analysisByPly: ReviewAnalysisByPly = {};
        setState((prev) => ({ ...prev, status: "analyzing" }));

        for (const [index, position] of positions.entries()) {
          const analysis = await analyzePosition(engine, position.fen, {
            depth: REVIEW_ENGINE_DEPTH,
            multiPV: REVIEW_ENGINE_MULTI_PV,
            skill: REVIEW_ENGINE_SKILL,
          });
          if (cancelled) return;

          analysisByPly[position.ply] = analysis;
          const evalByPly = evalByPlyFromAnalysis(analysisByPly);
          setState((prev) => ({
            ...prev,
            status: "analyzing",
            current: index + 1,
            total: positions.length,
            evalByPly,
            analysisByPly: { ...analysisByPly },
          }));
        }

        if (cancelled) return;
        const evalByPly = evalByPlyFromAnalysis(analysisByPly);
        setState({
          status: "ready",
          current: positions.length,
          total: positions.length,
          evalByPly,
          analysisByPly,
          moves: buildEngineReviewedMoves(targetGame.moves, evalByPly, {
            analysisByPly,
          }),
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...INITIAL_STATE,
          status: "error",
          total: positions.length,
          error:
            error instanceof Error
              ? error.message
              : "Stockfish analysis failed.",
        });
      }
    }

    void run();

    return () => {
      cancelled = true;
      try {
        engine?.stop();
      } catch {
        // ignore cleanup races
      }
      engine?.dispose();
    };
  }, [game]);

  return useMemo(() => state, [state]);
}
