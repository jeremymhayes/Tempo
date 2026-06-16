import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameMove, ParsedGame } from "@/types/chess";
import type { SavedGameSummary } from "@/lib/api/games";
import { deriveOpeningBreakdown } from "@/lib/chess/openings";
import { filterSavedGameSummaries } from "@/lib/games/filters";
import { createShareToken, isValidShareToken } from "@/lib/games/share-token";
import { createReviewSnapshot } from "@/lib/review/snapshot";

function move(ply: number, san: string, color: "w" | "b"): GameMove {
  return {
    ply,
    san,
    color,
    moveNumber: Math.floor(ply / 2) + 1,
    lan: "",
    from: "",
    to: "",
    fenBefore: "",
    fenAfter: `fen-${ply}`,
  };
}

function game(moves: GameMove[]): ParsedGame {
  return {
    pgn: "1. e4 e5 *",
    headers: {},
    initialFen: "start",
    moves,
    white: "Paul Morphy",
    black: "Duke Karl / Count Isouard",
    result: "1-0",
  };
}

function summary(overrides: Partial<SavedGameSummary>): SavedGameSummary {
  return {
    id: "game-1",
    white: "Paul Morphy",
    black: "Duke Karl / Count Isouard",
    result: "1-0",
    savedAt: "Jun 16, 2026, 12:00 AM",
    savedAtIso: "2026-06-16T05:00:00.000Z",
    moveCount: 34,
    openingName: "Philidor Defense",
    openingEco: "C41",
    averageAccuracy: 85.1,
    blunders: 0,
    shareEnabled: false,
    ...overrides,
  };
}

describe("opening breakdown", () => {
  it("recognizes the longest matching opening line and book exit move", () => {
    const breakdown = deriveOpeningBreakdown([
      move(0, "e4", "w"),
      move(1, "e5", "b"),
      move(2, "Nf3", "w"),
      move(3, "d6", "b"),
      move(4, "d4", "w"),
      move(5, "Bg4", "b"),
    ]);

    assert.equal(breakdown.name, "Philidor Defense");
    assert.equal(breakdown.eco, "C41");
    assert.equal(breakdown.bookLastPly, 3);
    assert.equal(breakdown.bookExitPly, 4);
    assert.equal(breakdown.bookExitMove, "3. d4");
  });

  it("falls back to an unclassified opening when no line matches", () => {
    const breakdown = deriveOpeningBreakdown([
      move(0, "h4", "w"),
      move(1, "a5", "b"),
    ]);

    assert.equal(breakdown.name, "Unclassified Opening");
    assert.equal(breakdown.eco, null);
    assert.equal(breakdown.bookExitPly, 0);
    assert.equal(breakdown.bookExitMove, "1. h4");
  });
});

describe("saved game filters", () => {
  const games = [
    summary({ id: "a", black: "Duke Karl", result: "1-0" }),
    summary({
      id: "b",
      white: "Ada",
      black: "Grace",
      result: "0-1",
      openingName: "Ruy Lopez",
      openingEco: "C60",
      averageAccuracy: 74.2,
      blunders: 3,
      savedAtIso: "2026-03-01T05:00:00.000Z",
    }),
  ];

  it("filters by opponent text, result, opening, accuracy, blunders, and date", () => {
    const filtered = filterSavedGameSummaries(games, {
      query: "duke",
      result: "1-0",
      opening: "Philidor Defense",
      minAccuracy: 80,
      maxBlunders: 0,
      dateRange: "last30",
      now: new Date("2026-06-16T12:00:00.000Z"),
    });

    assert.deepEqual(filtered.map((item) => item.id), ["a"]);
  });

  it("returns all games when filters are empty", () => {
    assert.deepEqual(
      filterSavedGameSummaries(games, {}).map((item) => item.id),
      ["a", "b"],
    );
  });
});

describe("review snapshots", () => {
  it("captures starter analysis in a serializable snapshot", () => {
    const snapshot = createReviewSnapshot(
      game([
        move(0, "e4", "w"),
        move(1, "e5", "b"),
        move(2, "Nf3", "w"),
        move(3, "d6", "b"),
        move(4, "d4", "w"),
        move(5, "Bg4", "b"),
      ]),
    );

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.moves.length, 6);
    assert.equal(snapshot.stats.accuracy.white, 90);
    assert.equal(snapshot.stats.rating.white, 1680);
    assert.equal(snapshot.blunders, 0);
    assert.equal(snapshot.moves[0].classification, "book");
  });
});

describe("share tokens", () => {
  it("creates URL-safe report tokens and validates token shape", () => {
    const token = createShareToken();

    assert.match(token, /^[A-Za-z0-9_-]{32}$/);
    assert.equal(isValidShareToken(token), true);
    assert.equal(isValidShareToken("../not-a-token"), false);
    assert.equal(isValidShareToken("short"), false);
  });
});
