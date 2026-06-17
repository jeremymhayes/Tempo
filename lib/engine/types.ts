// Engine abstraction layer. The UI talks to `AnalysisEngine` and never to a
// specific engine implementation, so new engines (e.g. a future in-browser
// Torch build) can be dropped in behind the same interface.

export type EngineId = "stockfish" | "torch";

export interface EngineDescriptor {
  id: EngineId;
  name: string;
  /** Short subtitle shown in the selector. */
  description: string;
  available: boolean;
  /** Why the engine can't be used, when `available` is false. */
  unavailableReason?: string;
}

/**
 * A raw engine score. `value` is from the **side-to-move** perspective, exactly
 * as UCI reports it. Convert to White's perspective with `toWhitePov` before
 * display so the eval bar and labels stay consistent.
 */
export interface EngineScore {
  type: "cp" | "mate";
  value: number;
}

/** One principal variation (a row when MultiPV > 1). */
export interface EngineLine {
  /** 1-based MultiPV index. */
  multipv: number;
  depth: number;
  score: EngineScore;
  /** Principal variation as UCI moves, e.g. ["e2e4", "e7e5"]. */
  pv: string[];
}

export interface AnalysisUpdate {
  /** Position this update describes. Used to discard stale results. */
  fen: string;
  /** Lines sorted by `multipv` ascending (line 1 = best). */
  lines: EngineLine[];
  /** Best move in UCI, from `bestmove` or the top line. */
  bestMove: string | null;
  depth: number;
  /** True once the engine emits `bestmove` (search finished). */
  done: boolean;
}

export interface AnalyzeOptions {
  /** Fixed-depth search. Ignored when `movetime` is set. */
  depth?: number;
  /** Fixed-time search in milliseconds. */
  movetime?: number;
  /** Fixed search effort in nodes. Takes precedence over movetime and depth. */
  nodes?: number;
  /** Number of lines to return (MultiPV). */
  multiPV?: number;
  /** Stockfish "Skill Level", 0–20. */
  skill?: number;
}

export type EngineStatus = "idle" | "loading" | "ready" | "analyzing" | "error";

export interface AnalysisEngine {
  readonly id: EngineId;
  /** Boot the worker and complete the UCI handshake. */
  init(): Promise<void>;
  /** Analyze a FEN, streaming updates until `done`. Supersedes any running search. */
  analyze(
    fen: string,
    options: AnalyzeOptions,
    onUpdate: (update: AnalysisUpdate) => void,
  ): void;
  /** Stop the current search (engine still emits a final `bestmove`). */
  stop(): void;
  /** Terminate the worker and free resources. */
  dispose(): void;
}
