import type { AnalyzeOptions } from "@/lib/engine/types";
import {
  REVIEW_ENGINE_MULTI_PV,
  REVIEW_ENGINE_SKILL,
} from "@/lib/review/deep-analysis";

export type ServerAnalysisEnv = Record<string, string | undefined>;

export type ServerAnalysisConfig = {
  enabled: boolean;
  analyzeOptions: AnalyzeOptions;
  maxMoves: number;
  maxPgnLength: number;
  maxConcurrent: number;
  stockfishFlavor: string;
  stockfishPath: string | null;
  stockfishThreads: number | null;
  stockfishHashMb: number | null;
};

const DEFAULT_MAX_MOVES = 200;
const DEFAULT_MAX_PGN_LENGTH = 200_000;
const DEFAULT_MAX_CONCURRENT = 1;
const DEFAULT_SERVER_ANALYSIS_DEPTH = 20;
const DEFAULT_STOCKFISH_FLAVOR = "single";
const MAX_STOCKFISH_THREADS = 32;
const MAX_STOCKFISH_HASH_MB = 4096;

export function isServerAnalysisEnabled(env: ServerAnalysisEnv): boolean {
  const value = env.TEMPO_SERVER_ANALYSIS_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function getServerAnalysisConfig(
  env: ServerAnalysisEnv = process.env,
): ServerAnalysisConfig {
  return {
    enabled: isServerAnalysisEnabled(env),
    analyzeOptions: {
      depth: readInt(
        env.TEMPO_SERVER_ANALYSIS_DEPTH,
        DEFAULT_SERVER_ANALYSIS_DEPTH,
        1,
        40,
      ),
      multiPV: readInt(
        env.TEMPO_SERVER_ANALYSIS_MULTI_PV,
        REVIEW_ENGINE_MULTI_PV,
        1,
        5,
      ),
      skill: readInt(
        env.TEMPO_SERVER_ANALYSIS_SKILL,
        REVIEW_ENGINE_SKILL,
        0,
        20,
      ),
    },
    maxMoves: readInt(
      env.TEMPO_SERVER_ANALYSIS_MAX_MOVES,
      DEFAULT_MAX_MOVES,
      1,
      500,
    ),
    maxPgnLength: readInt(
      env.TEMPO_SERVER_ANALYSIS_MAX_PGN_LENGTH,
      DEFAULT_MAX_PGN_LENGTH,
      1,
      1_000_000,
    ),
    maxConcurrent: readInt(
      env.TEMPO_SERVER_ANALYSIS_MAX_CONCURRENT,
      DEFAULT_MAX_CONCURRENT,
      1,
      4,
    ),
    stockfishFlavor:
      env.TEMPO_SERVER_STOCKFISH_FLAVOR?.trim() || DEFAULT_STOCKFISH_FLAVOR,
    stockfishPath: env.TEMPO_SERVER_STOCKFISH_PATH?.trim() || null,
    stockfishThreads: readOptionalInt(
      env.TEMPO_SERVER_STOCKFISH_THREADS,
      1,
      MAX_STOCKFISH_THREADS,
    ),
    stockfishHashMb: readOptionalInt(
      env.TEMPO_SERVER_STOCKFISH_HASH_MB,
      1,
      MAX_STOCKFISH_HASH_MB,
    ),
  };
}

function readInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function readOptionalInt(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}
