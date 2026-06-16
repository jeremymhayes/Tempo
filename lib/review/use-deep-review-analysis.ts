"use client";

import { useEffect, useMemo, useState } from "react";
import type { ParsedGame } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import type { AnalysisEngine, AnalyzeOptions } from "@/lib/engine/types";
import { createEngine } from "@/lib/engine";
import {
  fenSideToMove,
  toWhitePov,
  type WhiteScore,
} from "@/lib/engine/eval-format";
import {
  buildEngineReviewedMoves,
  REVIEW_ENGINE_DEPTH,
  REVIEW_ENGINE_SKILL,
  terminalWhiteScore,
  type ReviewEvalByPly,
} from "@/lib/review/deep-analysis";

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
  moves: ReviewedMove[];
  error: string | null;
};

const INITIAL_STATE: DeepReviewAnalysisState = {
  status: "idle",
  current: 0,
  total: 0,
  evalByPly: {},
  moves: [],
  error: null,
};

function analyzePosition(
  engine: AnalysisEngine,
  fen: string,
  options: AnalyzeOptions,
): Promise<WhiteScore> {
  const terminalScore = terminalWhiteScore(fen);
  if (terminalScore) return Promise.resolve(terminalScore);

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
        resolve(toWhitePov(line.score, fenSideToMove(fen)));
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

        const evalByPly: ReviewEvalByPly = {};
        setState((prev) => ({ ...prev, status: "analyzing" }));

        for (const [index, position] of positions.entries()) {
          const score = await analyzePosition(engine, position.fen, {
            depth: REVIEW_ENGINE_DEPTH,
            multiPV: 1,
            skill: REVIEW_ENGINE_SKILL,
          });
          if (cancelled) return;

          evalByPly[position.ply] = score;
          setState((prev) => ({
            ...prev,
            status: "analyzing",
            current: index + 1,
            total: positions.length,
            evalByPly: { ...evalByPly },
          }));
        }

        if (cancelled) return;
        setState({
          status: "ready",
          current: positions.length,
          total: positions.length,
          evalByPly,
          moves: buildEngineReviewedMoves(targetGame.moves, evalByPly),
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
