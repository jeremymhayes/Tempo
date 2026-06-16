import assert from "node:assert/strict";
import test from "node:test";
import { SAMPLE_PGN } from "../lib/chess/sample-game";
import { parsePgnForReview } from "../lib/chess/pgn-review";
import { createStarterReview } from "../lib/review/starter-review";

test("parsePgnForReview creates a reviewable game without a saved database id", () => {
  const result = parsePgnForReview(SAMPLE_PGN);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.game.white, "Paul Morphy");
  assert.equal(result.game.black, "Duke Karl / Count Isouard");
  assert.equal(result.game.moves.length > 0, true);
  assert.equal(result.game.moves[0].ply, 0);
  assert.equal(result.game.moves[0].fenBefore.includes(" "), true);
});

test("createStarterReview adds move classifications and a summary", () => {
  const parsed = parsePgnForReview(SAMPLE_PGN);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const review = createStarterReview(parsed.game);

  assert.equal(review.moves.length, parsed.game.moves.length);
  assert.ok(review.summary);
  assert.equal(typeof review.summary.accuracy.white, "number");
  assert.equal(typeof review.summary.accuracy.black, "number");
  assert.equal(
    review.moves.some((move) => move.classification !== undefined),
    true,
  );
});
