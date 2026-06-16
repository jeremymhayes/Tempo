import { Chess, DEFAULT_POSITION } from "chess.js";
import type { ParsedGame, PieceColor } from "@/types/chess";

export type StoredMoveRecord = {
  moveNumber: number;
  color: PieceColor;
  san: string;
  fenBefore: string;
  fenAfter: string;
};

export type StoredGameRecord = {
  pgn: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: Date | null;
  moves: StoredMoveRecord[];
};

export type ParsePgnForStorageResult =
  | { ok: true; game: StoredGameRecord }
  | { ok: false; error: string };

const VALID_RESULTS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);
const MAX_PGN_LENGTH = 200_000;

function cleanHeader(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeResult(value: string | undefined): string | null {
  const trimmed = cleanHeader(value);
  return trimmed && VALID_RESULTS.has(trimmed) ? trimmed : null;
}

function parsePgnDate(value: string | undefined): Date | null {
  const trimmed = cleanHeader(value);
  if (!trimmed || trimmed.includes("?")) return null;

  const match = /^(\d{4})[.-](\d{2})[.-](\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const playedAt = new Date(Date.UTC(year, month - 1, day));

  if (
    playedAt.getUTCFullYear() !== year ||
    playedAt.getUTCMonth() !== month - 1 ||
    playedAt.getUTCDate() !== day
  ) {
    return null;
  }

  return playedAt;
}

function moveNumberFromFen(fen: string, fallback: number): number {
  const fullMoveNumber = Number(fen.split(" ")[5]);
  return Number.isInteger(fullMoveNumber) && fullMoveNumber > 0
    ? fullMoveNumber
    : fallback;
}

export function parsePgnForStorage(pgn: string): ParsePgnForStorageResult {
  const trimmed = pgn.trim();
  if (!trimmed) {
    return { ok: false, error: "PGN is required." };
  }

  if (trimmed.length > MAX_PGN_LENGTH) {
    return { ok: false, error: "PGN is too large to save." };
  }

  const chess = new Chess();
  try {
    chess.loadPgn(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return { ok: false, error: `Invalid PGN: ${message}` };
  }

  const history = chess.history({ verbose: true });
  if (history.length === 0) {
    return { ok: false, error: "No moves found in this PGN." };
  }

  const headers = chess.getHeaders();
  const moves = history.map((move, index) => ({
    moveNumber: moveNumberFromFen(move.before, Math.floor(index / 2) + 1),
    color: move.color as PieceColor,
    san: move.san,
    fenBefore: move.before,
    fenAfter: move.after,
  }));

  return {
    ok: true,
    game: {
      pgn: trimmed,
      whiteName: cleanHeader(headers.White),
      blackName: cleanHeader(headers.Black),
      result: normalizeResult(headers.Result),
      event: cleanHeader(headers.Event),
      site: cleanHeader(headers.Site),
      playedAt: parsePgnDate(headers.Date),
      moves,
    },
  };
}

export function storedGameToParsedGame(game: StoredGameRecord): ParsedGame {
  const result =
    game.result === "1-0" ||
    game.result === "0-1" ||
    game.result === "1/2-1/2"
      ? game.result
      : "*";

  const datePlayed = game.playedAt
    ? `${game.playedAt.getUTCFullYear()}.${String(
        game.playedAt.getUTCMonth() + 1,
      ).padStart(2, "0")}.${String(game.playedAt.getUTCDate()).padStart(2, "0")}`
    : undefined;

  return {
    pgn: game.pgn,
    headers: {
      Event: game.event || undefined,
      Site: game.site || undefined,
      Date: datePlayed,
      White: game.whiteName || undefined,
      Black: game.blackName || undefined,
      Result: result,
    },
    initialFen: game.moves[0]?.fenBefore ?? DEFAULT_POSITION,
    moves: game.moves.map((move, index) => ({
      ply: index,
      moveNumber: move.moveNumber,
      color: move.color,
      san: move.san,
      lan: "",
      from: "",
      to: "",
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
    })),
    white: game.whiteName || "White",
    black: game.blackName || "Black",
    result,
    datePlayed,
  };
}
