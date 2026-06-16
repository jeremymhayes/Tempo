import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameMove, ParsedGame } from "@/types/chess";
import type { SavedGameDetailDto, SavedGameSummary } from "@/lib/api/games";
import { toParsedGame } from "@/lib/api/games";
import { deriveOpeningBreakdown } from "@/lib/chess/openings";
import { filterSavedGameSummaries } from "@/lib/games/filters";
import { reviewSnapshotPersistenceFields } from "@/lib/games/queries";
import { createShareToken, isValidShareToken } from "@/lib/games/share-token";
import {
  createReviewSnapshot,
  createReviewSnapshotFromMoves,
  evalByPlyFromSnapshot,
  isReviewSnapshot,
  reviewSnapshotHasEngineAnalysis,
} from "@/lib/review/snapshot";
import { selectReviewFocusFen } from "@/lib/review/report-focus";

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
    assert.equal(snapshot.stats.accuracy.white, 100);
    assert.equal(snapshot.stats.rating.white, 1750);
    assert.equal(snapshot.blunders, 0);
    assert.equal(snapshot.moves[0].classification, "book");
  });

  it("captures engine-backed review details in a serializable snapshot", () => {
    const snapshot = createReviewSnapshotFromMoves([
      {
        ...move(0, "e4", "w"),
        classification: "excellent",
        centipawnLoss: 15,
        bestMove: "d4",
        bestMoveUci: "d2d4",
        bestLine: ["d4", "d5", "c4"],
        playedBestMove: false,
        isSacrifice: false,
        evalBefore: { type: "cp", value: 20, depth: 16 },
        evalAfter: { type: "cp", value: 5, depth: 16 },
      },
      {
        ...move(1, "Nf6", "b"),
        classification: "blunder",
        centipawnLoss: 450,
        bestMove: "Qf6",
        bestMoveUci: "d8f6",
        bestLine: ["Qf6", "Qxf6"],
        playedBestMove: false,
        evalBefore: { type: "cp", value: 5, depth: 16 },
        evalAfter: { type: "cp", value: 455, depth: 16 },
      },
    ]);

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.stats.counts.white.excellent, 1);
    assert.equal(snapshot.stats.counts.black.blunder, 1);
    assert.equal(snapshot.blunders, 1);
    assert.equal(snapshot.moves[0].bestMove, "d4");
    assert.equal(snapshot.moves[0].bestMoveUci, "d2d4");
    assert.deepEqual(snapshot.moves[0].bestLine, ["d4", "d5", "c4"]);
    assert.equal(snapshot.moves[0].playedBestMove, false);
    assert.equal(snapshot.moves[0].evalBefore?.value, 20);
    assert.equal(snapshot.moves[1].evalAfter?.value, 455);
    assert.equal(isReviewSnapshot(snapshot), true);
    assert.equal(isReviewSnapshot({ version: 1, moves: "bad" }), false);
  });

  it("builds eval graph data from a persisted review snapshot", () => {
    const snapshot = createReviewSnapshotFromMoves([
      {
        ...move(0, "e4", "w"),
        classification: "best",
        evalBefore: { type: "cp", value: 10 },
        evalAfter: { type: "cp", value: 20 },
      },
      {
        ...move(1, "e5", "b"),
        classification: "best",
        evalBefore: { type: "cp", value: 20 },
        evalAfter: { type: "cp", value: 12 },
      },
    ]);

    assert.deepEqual(evalByPlyFromSnapshot(snapshot), {
      [-1]: { type: "cp", value: 10 },
      0: { type: "cp", value: 20 },
      1: { type: "cp", value: 12 },
    });
  });

  it("detects when a snapshot already contains engine analysis", () => {
    const starterSnapshot = createReviewSnapshot(
      game([move(0, "e4", "w"), move(1, "e5", "b")]),
    );
    const engineSnapshot = createReviewSnapshotFromMoves([
      {
        ...move(0, "e4", "w"),
        bestMoveUci: "d2d4",
        evalBefore: { type: "cp", value: 10 },
      },
    ]);

    assert.equal(reviewSnapshotHasEngineAnalysis(null), false);
    assert.equal(reviewSnapshotHasEngineAnalysis(starterSnapshot), false);
    assert.equal(reviewSnapshotHasEngineAnalysis(engineSnapshot), true);
  });

  it("derives saved-game aggregate fields from an engine snapshot", () => {
    const snapshot = createReviewSnapshotFromMoves([
      { ...move(0, "e4", "w"), classification: "best", centipawnLoss: 0 },
      {
        ...move(1, "Nf6", "b"),
        classification: "blunder",
        centipawnLoss: 450,
      },
    ]);

    assert.deepEqual(reviewSnapshotPersistenceFields(snapshot), {
      averageAccuracy: 65.4,
      blunders: 1,
    });
  });

  it("selects the most instructive shared-report board position", () => {
    assert.equal(
      selectReviewFocusFen(
        [
          { ...move(0, "e4", "w"), classification: "mistake" },
          { ...move(1, "Nf6", "b"), classification: "miss" },
          { ...move(2, "Qh5", "w"), classification: "blunder" },
        ],
        "start",
      ),
      "fen-2",
    );
    assert.equal(
      selectReviewFocusFen(
        [
          { ...move(0, "e4", "w"), classification: "best" },
          { ...move(1, "Nf6", "b"), classification: "miss" },
        ],
        "start",
      ),
      "fen-1",
    );
    assert.equal(
      selectReviewFocusFen(
        [{ ...move(0, "e4", "w"), classification: "best" }],
        "start",
      ),
      "start",
    );
  });
});

describe("saved game parsing", () => {
  it("reconstructs full move metadata from saved PGN for engine comparison", () => {
    const saved: SavedGameDetailDto = {
      id: "game-1",
      userId: "user-1",
      pgn: "1. e4 e5 2. Nf3 Nc6 *",
      whiteName: "White",
      blackName: "Black",
      result: "*",
      event: null,
      site: null,
      playedAt: null,
      openingName: null,
      openingEco: null,
      bookExitPly: null,
      bookExitMove: null,
      reviewSnapshot: null,
      reviewSnapshotUpdatedAt: null,
      shareToken: null,
      shareEnabled: false,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
      moves: [
        {
          id: "m1",
          moveNumber: 1,
          color: "w",
          san: "e4",
          fenBefore: "",
          fenAfter: "",
        },
      ],
    };

    const parsed = toParsedGame(saved);

    assert.equal(parsed.moves[0].lan, "e2e4");
    assert.equal(parsed.moves[0].from, "e2");
    assert.equal(parsed.moves[0].to, "e4");
    assert.equal(parsed.moves[1].lan, "e7e5");
    assert.equal(parsed.moves[2].lan, "g1f3");
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
