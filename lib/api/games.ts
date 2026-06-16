import { DEFAULT_POSITION } from "chess.js";
import type { ParsedGame, PieceColor } from "@/types/chess";
import type { ReviewSummary, ReviewedMove } from "@/types/review";
import { createStarterReview } from "@/lib/review/starter-review";

export type SavedMoveDto = {
  id: string;
  moveNumber: number;
  color: string;
  san: string;
  fenBefore: string;
  fenAfter: string;
};

export type ListGameDto = {
  id: string;
  userId: string | null;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: string | null;
  createdAt: string;
  moveCount: number;
};

export type SavedGameDetailDto = {
  id: string;
  userId: string | null;
  pgn: string;
  whiteName: string | null;
  blackName: string | null;
  result: string | null;
  event: string | null;
  site: string | null;
  playedAt: string | null;
  createdAt: string;
  updatedAt: string;
  moves: SavedMoveDto[];
};

export interface SavedGameSummary {
  id: string;
  white: string;
  black: string;
  result: string;
  event?: string;
  site?: string;
  datePlayed?: string;
  savedAt: string;
  moveCount: number;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function formatDisplayDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toPgnDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function toSavedGameSummary(game: ListGameDto): SavedGameSummary {
  return {
    id: game.id,
    white: game.whiteName || "White",
    black: game.blackName || "Black",
    result: game.result || "*",
    event: game.event || undefined,
    site: game.site || undefined,
    datePlayed: formatDisplayDate(game.playedAt),
    savedAt: formatSavedAt(game.createdAt),
    moveCount: game.moveCount,
  };
}

export function toParsedGame(game: SavedGameDetailDto): ParsedGame {
  const result = game.result || "*";
  const datePlayed = toPgnDate(game.playedAt);

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
      color: move.color as PieceColor,
      san: move.san,
      lan: "",
      from: "",
      to: "",
      fenBefore: move.fenBefore,
      fenAfter: move.fenAfter,
    })),
    white: game.whiteName || "White",
    black: game.blackName || "Black",
    result: result === "1-0" || result === "0-1" || result === "1/2-1/2" ? result : "*",
    datePlayed,
  };
}

export async function listSavedGames(): Promise<SavedGameSummary[]> {
  const response = await fetch("/api/games", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const games = (await response.json()) as ListGameDto[];
  return games.map(toSavedGameSummary);
}

export async function saveGamePgn(pgn: string): Promise<SavedGameDetailDto> {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pgn }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as SavedGameDetailDto;
}

export async function getSavedGame(id: string): Promise<SavedGameDetailDto> {
  const response = await fetch(`/api/games/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as SavedGameDetailDto;
}

export async function requestReview(game: ParsedGame): Promise<{
  moves: ReviewedMove[];
  summary: ReviewSummary | null;
}> {
  return createStarterReview(game);
}
