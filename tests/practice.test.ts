import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import {
  choosePracticeBotMove,
  eloToBotConfig,
  normalizeBotElo,
  PRACTICE_BOT_ELOS,
} from "@/lib/practice/bot";
import type { EngineLine } from "@/lib/engine/types";
import {
  PRACTICE_MOVE_VISIBLE_ROWS,
  toPracticeMoveItems,
} from "@/lib/practice/moves";
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
  assert.equal(low.limitStrength, true);
  assert.equal(low.uciElo, 1320);
  assert.ok(low.randomMoveChance >= 0.5);
  assert.equal(high.uciElo, 2400);
  assert.equal(high.randomMoveChance, 0);
});

test("practice bot deliberately weakens low Elo moves beyond Stockfish skill", () => {
  const chess = new Chess();
  chess.move("e4");
  const low = eloToBotConfig(400);
  const lines: EngineLine[] = [
    {
      multipv: 1,
      depth: 1,
      score: { type: "cp", value: 20 },
      pv: ["e7e5"],
    },
    {
      multipv: 2,
      depth: 1,
      score: { type: "cp", value: 5 },
      pv: ["c7c5"],
    },
  ];

  const move = choosePracticeBotMove(chess, lines, low, sequence(0.1, 0.99));

  assert.notEqual(move, "e7e5");
  assert.ok(chess.moves({ verbose: true }).some((legal) => {
    const promotion = legal.promotion ? String(legal.promotion) : "";
    return `${legal.from}${legal.to}${promotion}` === move;
  }));
});

test("practice bot keeps high Elo tied to the engine best move", () => {
  const chess = new Chess();
  chess.move("e4");
  const high = eloToBotConfig(2400);
  const lines: EngineLine[] = [
    {
      multipv: 1,
      depth: 10,
      score: { type: "cp", value: 20 },
      pv: ["e7e5"],
    },
    {
      multipv: 2,
      depth: 10,
      score: { type: "cp", value: 5 },
      pv: ["c7c5"],
    },
  ];

  assert.equal(choosePracticeBotMove(chess, lines, high, () => 0.01), "e7e5");
});

function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

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

test("practice move list exposes every half-move with active latest move", () => {
  const chess = new Chess();
  for (const san of ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]) {
    chess.move(san);
  }

  const items = toPracticeMoveItems(chess.history({ verbose: true }));

  assert.equal(PRACTICE_MOVE_VISIBLE_ROWS, 10);
  assert.deepEqual(
    items.map((item) => item.label),
    ["1. e4", "1... e5", "2. Nf3", "2... Nc6", "3. Bb5", "3... a6"],
  );
  assert.equal(items.at(-1)?.active, true);
  assert.equal(items.slice(0, -1).every((item) => !item.active), true);
});
