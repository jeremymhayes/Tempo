// Minimal UCI output parsing. Kept pure and engine-agnostic so any UCI engine
// implementation can reuse it.

import type { EngineScore } from "./types";

export interface ParsedInfo {
  depth?: number;
  multipv?: number;
  score?: EngineScore;
  pv?: string[];
}

/**
 * Parse an `info` line, e.g.
 *   info depth 18 multipv 1 score cp 34 ... pv e2e4 e7e5 g1f3
 * Returns null for lines without a principal variation (e.g. `info string`).
 */
export function parseInfoLine(line: string): ParsedInfo | null {
  if (!line.startsWith("info ")) return null;
  const tokens = line.split(/\s+/);

  const info: ParsedInfo = {};
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token) {
      case "depth":
        info.depth = Number(tokens[++i]);
        break;
      case "multipv":
        info.multipv = Number(tokens[++i]);
        break;
      case "score": {
        const kind = tokens[++i];
        const value = Number(tokens[++i]);
        if (kind === "cp") info.score = { type: "cp", value };
        else if (kind === "mate") info.score = { type: "mate", value };
        break;
      }
      case "pv":
        info.pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
      default:
        break;
    }
  }

  return info.pv && info.pv.length > 0 ? info : null;
}

/**
 * Parse a `bestmove` line. Returns the UCI move, or null for `bestmove (none)`.
 * Returns undefined when the line isn't a bestmove line at all.
 */
export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith("bestmove")) return undefined;
  const move = line.split(/\s+/)[1];
  if (!move || move === "(none)") return null;
  return move;
}
