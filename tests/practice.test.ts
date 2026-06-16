import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import {
  eloToBotConfig,
  normalizeBotElo,
  PRACTICE_BOT_ELOS,
} from "@/lib/practice/bot";
import { buildPracticePgn, getPracticeResult } from "@/lib/practice/pgn";

test("practice bot config maps Elo into bounded Stockfish settings", () => {
  assert.equal(normalizeBotElo(50), PRACTICE_BOT_ELOS[0]);
  assert.equal(normalizeBotElo(9999), PRACTICE_BOT_ELOS.at(-1));
  assert.equal(normalizeBotElo(1175), 1200);

  const low = eloToBotConfig(400);
  const high = eloToBotConfig(2400);

  assert.equal(low.skill, 0);
  assert.equal(high.skill, 20);
  assert.ok(low.movetime < high.movetime);
  assert.ok(low.depth < high.depth);
});

test("practice result detects checkmate and draws from chess.js state", () => {
  const mate = new Chess();
  mate.move("f3");
  mate.move("e5");
  mate.move("g4");
  mate.move("Qh4#");

  assert.equal(getPracticeResult(mate), "0-1");

  const resigned = new Chess();
  resigned.move("e4");
  assert.equal(getPracticeResult(resigned, { resignedBy: "b" }), "1-0");
});

test("practice PGN includes bot metadata and parses into the review flow", () => {
  const chess = new Chess();
  chess.move("e4");
  chess.move("e5");
  chess.move("Nf3");
  chess.move("Nc6");

  const pgn = buildPracticePgn({
    chess,
    playerColor: "w",
    botElo: 1200,
    result: "1-0",
    finishedAt: new Date(Date.UTC(2026, 5, 16)),
  });

  assert.match(pgn, /\[Event "Tempo Practice"\]/);
  assert.match(pgn, /\[White "Player"\]/);
  assert.match(pgn, /\[Black "Tempo Bot 1200"\]/);
  assert.match(pgn, /\[Result "1-0"\]/);

  const parsed = parsePgnForReview(pgn);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ok ? parsed.game.white : "", "Player");
  assert.equal(parsed.ok ? parsed.game.black : "", "Tempo Bot 1200");
  assert.equal(parsed.ok ? parsed.game.moves.length : 0, 4);
});
