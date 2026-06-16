"use client";

import { useEffect, useMemo, useState } from "react";
import type { ParsedGame } from "@/types/chess";
import type { ReviewedMove } from "@/types/review";
import { createEngine } from "@/lib/engine";
import { analyzeGameOnServer } from "@/lib/api/review-analysis";
import {
  type ReviewAnalysisByPly,
  type ReviewEvalByPly,
} from "@/lib/review/deep-analysis";
import {
  analyzeGameWithEngine,
  defaultReviewAnalyzeOptions,
  getReviewPositions,
} from "@/lib/review/engine-analysis";

type ReviewAnalysisStatus =
  | "idle"
  | "loading-server"
  | "loading-engine"
  | "analyzing"
  | "ready"
  | "error";

type ReviewAnalysisSource = "server" | "browser" | null;

export type DeepReviewAnalysisState = {
  status: ReviewAnalysisStatus;
  current: number;
  total: number;
  evalByPly: ReviewEvalByPly;
  analysisByPly: ReviewAnalysisByPly;
  moves: ReviewedMove[];
  error: string | null;
  source: ReviewAnalysisSource;
  startedAtMs: number | null;
  updatedAtMs: number | null;
};

const INITIAL_STATE: DeepReviewAnalysisState = {
  status: "idle",
  current: 0,
  total: 0,
  evalByPly: {},
  analysisByPly: {},
  moves: [],
  error: null,
  source: null,
  startedAtMs: null,
  updatedAtMs: null,
};

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
    let engine: ReturnType<typeof createEngine> | null = null;
    const positions = getReviewPositions(targetGame);

    async function run() {
      const serverStartedAtMs = Date.now();
      setState({
        ...INITIAL_STATE,
        status: "loading-server",
        total: positions.length,
        source: "server",
        startedAtMs: serverStartedAtMs,
        updatedAtMs: serverStartedAtMs,
      });

      try {
        const serverResult = await analyzeGameOnServer(targetGame, {
          onProgress: ({ current, total, evalByPly, analysisByPly }) => {
            if (cancelled) return;
            const updatedAtMs = Date.now();
            setState((prev) => ({
              ...prev,
              status: "loading-server",
              current,
              total,
              evalByPly,
              analysisByPly,
              source: "server",
              startedAtMs: prev.startedAtMs ?? serverStartedAtMs,
              updatedAtMs,
            }));
          },
        });
        if (cancelled) return;

        setState({
          status: "ready",
          current: serverResult.current,
          total: serverResult.total,
          evalByPly: serverResult.evalByPly,
          analysisByPly: serverResult.analysisByPly,
          moves: serverResult.moves,
          error: null,
          source: "server",
          startedAtMs: serverStartedAtMs,
          updatedAtMs: Date.now(),
        });
        return;
      } catch (serverError) {
        if (cancelled) return;
        console.info(
          "Server review analysis unavailable; falling back to browser Stockfish:",
          serverError,
        );
      }

      try {
        const browserStartedAtMs = Date.now();
        setState({
          ...INITIAL_STATE,
          status: "loading-engine",
          total: positions.length,
          source: "browser",
          startedAtMs: browserStartedAtMs,
          updatedAtMs: browserStartedAtMs,
        });

        engine = createEngine("stockfish");
        await engine.init();
        if (cancelled) return;

        setState((prev) => ({ ...prev, status: "analyzing" }));

        const browserResult = await analyzeGameWithEngine(targetGame, engine, {
          analyzeOptions: defaultReviewAnalyzeOptions(),
          onProgress: ({ current, total, evalByPly, analysisByPly }) => {
            if (cancelled) return;
            const updatedAtMs = Date.now();
            setState((prev) => ({
              ...prev,
              status: "analyzing",
              current,
              total,
              evalByPly,
              analysisByPly,
              source: "browser",
              startedAtMs: prev.startedAtMs ?? browserStartedAtMs,
              updatedAtMs,
            }));
          },
        });
        if (cancelled) return;

        setState({
          status: "ready",
          current: browserResult.current,
          total: browserResult.total,
          evalByPly: browserResult.evalByPly,
          analysisByPly: browserResult.analysisByPly,
          moves: browserResult.moves,
          error: null,
          source: "browser",
          startedAtMs: browserStartedAtMs,
          updatedAtMs: Date.now(),
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
          source: "browser",
          startedAtMs: null,
          updatedAtMs: null,
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
