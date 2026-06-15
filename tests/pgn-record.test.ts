import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_POSITION } from "chess.js";
import { parsePgnForStorage } from "../lib/chess/pgn-record";

const SAMPLE_PGN = `[Event "Tempo Smoke"]
[Site "Local"]
[Date "2026.06.15"]
[White "Ada"]
[Black "Grace"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 *`;

test("parsePgnForStorage extracts metadata and move rows from PGN", () => {
  const result = parsePgnForStorage(SAMPLE_PGN);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.game.whiteName, "Ada");
  assert.equal(result.game.blackName, "Grace");
  assert.equal(result.game.event, "Tempo Smoke");
  assert.equal(result.game.site, "Local");
  assert.equal(result.game.result, "*");
  assert.equal(result.game.playedAt?.toISOString(), "2026-06-15T00:00:00.000Z");
  assert.equal(result.game.moves.length, 4);

  assert.deepEqual(
    result.game.moves.map(({ moveNumber, color, san }) => ({
      moveNumber,
      color,
      san,
    })),
    [
      { moveNumber: 1, color: "w", san: "e4" },
      { moveNumber: 1, color: "b", san: "e5" },
      { moveNumber: 2, color: "w", san: "Nf3" },
      { moveNumber: 2, color: "b", san: "Nc6" },
    ],
  );
  assert.equal(result.game.moves[0].fenBefore, DEFAULT_POSITION);
  assert.notEqual(result.game.moves[0].fenAfter, DEFAULT_POSITION);
});

test("parsePgnForStorage rejects PGNs with no moves", () => {
  const result = parsePgnForStorage(`[Event "Empty"]\n\n*`);

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /No moves/i);
});
