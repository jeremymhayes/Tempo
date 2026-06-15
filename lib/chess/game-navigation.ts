import type { ParsedGame } from "@/types/chess";

/**
 * Navigation is modeled with a single cursor: the index of the *last move
 * played*. `-1` means the starting position (no moves played yet), and
 * `moves.length - 1` is the final position.
 *
 * These helpers are pure so navigation logic stays out of the React tree and
 * can be unit-tested on its own.
 */

export const START_PLY = -1;

/** Clamp a ply index to the valid range for a game. */
export function clampPly(game: ParsedGame, ply: number): number {
  return Math.max(START_PLY, Math.min(ply, game.moves.length - 1));
}

/** FEN for the position after `ply` moves (or the start position at -1). */
export function fenAtPly(game: ParsedGame, ply: number): string {
  if (ply < 0) return game.initialFen;
  const move = game.moves[clampPly(game, ply)];
  return move.fenAfter;
}

export function nextPly(game: ParsedGame, ply: number): number {
  return clampPly(game, ply + 1);
}

export function prevPly(game: ParsedGame, ply: number): number {
  return clampPly(game, ply - 1);
}

export function isAtStart(ply: number): boolean {
  return ply <= START_PLY;
}

export function isAtEnd(game: ParsedGame, ply: number): boolean {
  return ply >= game.moves.length - 1;
}

/** The two squares of the last move, for board highlighting. */
export function lastMoveSquares(
  game: ParsedGame,
  ply: number,
): { from: string; to: string } | null {
  if (ply < 0 || ply >= game.moves.length) return null;
  const move = game.moves[ply];
  if (!move.from || !move.to) return null;
  return { from: move.from, to: move.to };
}
