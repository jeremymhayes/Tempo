import { Chess, DEFAULT_POSITION } from "chess.js";
import type {
  GameHeaders,
  GameResult,
  GameMove,
  ParsedGame,
  PieceColor,
} from "@/types/chess";

export type ParsePgnResult =
  | { ok: true; game: ParsedGame }
  | { ok: false; error: string };

const VALID_RESULTS: GameResult[] = ["1-0", "0-1", "1/2-1/2", "*"];

function normalizeResult(raw: string | undefined): GameResult {
  return VALID_RESULTS.includes(raw as GameResult) ? (raw as GameResult) : "*";
}

/**
 * Parse a PGN string into a navigable {@link ParsedGame}.
 *
 * Pure function: no React, no I/O. Returns a discriminated result instead of
 * throwing so callers can render validation errors cleanly.
 */
export function parsePgn(pgn: string): ParsePgnResult {
  const trimmed = pgn.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a PGN to review." };
  }

  const chess = new Chess();
  try {
    chess.loadPgn(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parse error.";
    return { ok: false, error: `Invalid PGN: ${message}` };
  }

  const verbose = chess.history({ verbose: true });
  if (verbose.length === 0) {
    return { ok: false, error: "No moves found in this PGN." };
  }

  const headers = chess.getHeaders() as GameHeaders;
  const initialFen = headers.FEN ?? DEFAULT_POSITION;

  const moves: GameMove[] = verbose.map((m, index) => ({
    ply: index,
    moveNumber: Math.floor(index / 2) + 1,
    color: m.color as PieceColor,
    san: m.san,
    lan: m.lan,
    from: m.from,
    to: m.to,
    captured: m.captured,
    promotion: m.promotion,
    fenBefore: m.before,
    fenAfter: m.after,
  }));

  const game: ParsedGame = {
    pgn: trimmed,
    headers,
    initialFen,
    moves,
    white: headers.White?.trim() || "White",
    black: headers.Black?.trim() || "Black",
    result: normalizeResult(headers.Result),
    datePlayed: headers.Date && headers.Date !== "????.??.??" ? headers.Date : undefined,
  };

  return { ok: true, game };
}
