import type { ParsedGame } from "@/types/chess";
import type { ReviewSummary, ReviewedMove } from "@/types/review";

/**
 * Placeholder service layer for the future backend.
 *
 * Today these functions are stubs returning mock/empty data so the UI can be
 * built against a stable interface. When the backend (PostgreSQL + Prisma +
 * Stockfish, served via Cloudflare Tunnel at chess.jeremymhayes.com) is ready,
 * swap the bodies for real `fetch` calls — the call sites won't change.
 */

/** A game row as it will appear on the Past Games page. */
export interface SavedGameSummary {
  id: string;
  white: string;
  black: string;
  result: string;
  /** Date the game was played (from PGN). */
  datePlayed?: string;
  /** Date the review was saved to the account. */
  savedAt: string;
}

/** List the signed-in user's saved games. Stubbed: returns empty. */
export async function listSavedGames(): Promise<SavedGameSummary[]> {
  return [];
}

/** Persist a reviewed game for later. Stubbed: no-op. */
export async function saveGame(game: ParsedGame): Promise<{ id: string }> {
  void game; // will POST to the backend once accounts exist
  return { id: "local-only" };
}

/**
 * Request engine analysis for a game. Stubbed: echoes moves back with no
 * analysis fields populated. The Stockfish backend will fill these in.
 */
export async function requestReview(game: ParsedGame): Promise<{
  moves: ReviewedMove[];
  summary: ReviewSummary | null;
}> {
  return { moves: game.moves.map((m) => ({ ...m })), summary: null };
}
