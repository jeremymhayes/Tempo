import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameMove } from "@/types/chess";
import {
  buildReviewStats,
  estimateGameRating,
  shouldShowMoveIcon,
  toMovePairs,
} from "@/lib/review/review-stats";
import {
  buildEngineReviewedMoves,
  terminalWhiteScore,
} from "@/lib/review/deep-analysis";

type GameMoveWithClass = GameMove & {
  classification?:
    | "brilliant"
    | "great"
    | "best"
    | "good"
    | "book"
    | "inaccuracy"
    | "miss"
    | "mistake"
    | "blunder";
};

function move(
  ply: number,
  san: string,
  color: "w" | "b",
  classification?: GameMoveWithClass["classification"],
): GameMoveWithClass {
  return {
    ply,
    san,
    color,
    moveNumber: Math.floor(ply / 2) + 1,
    lan: "",
    from: "e2",
    to: "e4",
    fenBefore: "",
    fenAfter: "",
    classification,
  };
}

describe("review stats helpers", () => {
  it("builds per-side accuracy, counts, and estimated ratings", () => {
    const stats = buildReviewStats([
      move(0, "e4", "w", "book"),
      move(1, "e5", "b", "best"),
      move(2, "Nf3", "w", "great"),
      move(3, "d6", "b", "mistake"),
      move(4, "d4", "w", "brilliant"),
      move(5, "Bg4", "b", "blunder"),
    ]);

    assert.equal(stats.counts.white.book, 1);
    assert.equal(stats.counts.white.great, 1);
    assert.equal(stats.counts.white.brilliant, 1);
    assert.equal(stats.counts.black.best, 1);
    assert.equal(stats.counts.black.mistake, 1);
    assert.equal(stats.counts.black.blunder, 1);
    assert.equal(stats.accuracy.white, 93.3);
    assert.equal(stats.accuracy.black, 50.3);
    assert.equal(stats.rating.white, 1720);
    assert.equal(stats.rating.black, 1204);
  });

  it("estimates game ratings from accuracy", () => {
    assert.equal(estimateGameRating(93.3), 1720);
    assert.equal(estimateGameRating(undefined), undefined);
  });

  it("shows move-list icons only for brilliant, great, mistake, and blunder", () => {
    assert.equal(shouldShowMoveIcon("brilliant"), true);
    assert.equal(shouldShowMoveIcon("great"), true);
    assert.equal(shouldShowMoveIcon("mistake"), true);
    assert.equal(shouldShowMoveIcon("blunder"), true);
    assert.equal(shouldShowMoveIcon("best"), false);
    assert.equal(shouldShowMoveIcon("book"), false);
    assert.equal(shouldShowMoveIcon("good"), false);
    assert.equal(shouldShowMoveIcon("inaccuracy"), false);
    assert.equal(shouldShowMoveIcon("miss"), false);
    assert.equal(shouldShowMoveIcon(undefined), false);
  });

  it("groups half-moves into notation pairs", () => {
    const pairs = toMovePairs([
      move(0, "e4", "w", "book"),
      move(1, "e5", "b", "best"),
      move(2, "Nf3", "w", "great"),
    ]);

    assert.equal(pairs.length, 2);
    assert.equal(pairs[0].moveNumber, 1);
    assert.equal(pairs[0].white?.san, "e4");
    assert.equal(pairs[0].black?.san, "e5");
    assert.equal(pairs[1].moveNumber, 2);
    assert.equal(pairs[1].white?.san, "Nf3");
    assert.equal(pairs[1].black, undefined);
  });

  it("classifies moves from engine eval swings instead of starter heuristics", () => {
    const reviewed = buildEngineReviewedMoves(
      [
        move(0, "Qh5", "w"),
        move(1, "Nc6", "b"),
      ],
      {
        [-1]: { type: "cp", value: 300 },
        0: { type: "cp", value: -250 },
        1: { type: "cp", value: 200 },
      },
    );

    assert.equal(reviewed[0].classification, "blunder");
    assert.equal(reviewed[0].centipawnLoss, 550);
    assert.equal(reviewed[1].classification, "blunder");
    assert.equal(reviewed[1].centipawnLoss, 450);
  });

  it("scores terminal checkmate positions without Stockfish output", () => {
    const score = terminalWhiteScore(
      "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17",
    );

    assert.deepEqual(score, { type: "mate", value: 1 });
  });
});
