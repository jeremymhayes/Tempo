import type { EngineId } from "./types";

export interface AnalysisSettings {
  engineId: EngineId;
  /** Whether the search is bounded by depth or by time. */
  mode: "depth" | "time";
  depth: number;
  /** Analysis time per position, in milliseconds. */
  movetime: number;
  /** Number of candidate lines (MultiPV). */
  multiPV: number;
  /** Engine strength, 0–20 (Stockfish "Skill Level"). */
  skill: number;
  autoAnalyze: boolean;
  showEvalBar: boolean;
  showBestMove: boolean;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  engineId: "stockfish",
  mode: "depth",
  depth: 16,
  movetime: 1000,
  multiPV: 2,
  skill: 20,
  autoAnalyze: true,
  showEvalBar: true,
  showBestMove: true,
};

export const SETTINGS_BOUNDS = {
  depth: { min: 6, max: 30 },
  movetime: { min: 200, max: 5000, step: 100 },
  multiPV: { min: 1, max: 5 },
  skill: { min: 0, max: 20 },
} as const;

const STORAGE_KEY = "tempo:analysis-settings";

export function loadSettings(): AnalysisSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AnalysisSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AnalysisSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // non-fatal
  }
}
