"use client";

import type { ParsedGame } from "@/types/chess";

/**
 * Frontend-only persistence for the currently-loaded game.
 *
 * The home page parses a PGN and stashes it here; the review page reads it back.
 * Uses sessionStorage so a refresh on the review page keeps the game, while a
 * new tab / closed window starts clean. This is a deliberate placeholder until
 * a backend can persist and return saved games.
 */

const CURRENT_GAME_KEY = "chess-reviewer:current-game";

export function saveCurrentGame(game: ParsedGame): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(game));
  } catch {
    // Quota or serialization failure — non-fatal for a placeholder store.
  }
}

export function loadCurrentGame(): ParsedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CURRENT_GAME_KEY);
    return raw ? (JSON.parse(raw) as ParsedGame) : null;
  } catch {
    return null;
  }
}

export function clearCurrentGame(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CURRENT_GAME_KEY);
}
