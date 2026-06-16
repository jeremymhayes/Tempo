import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import {
  analyzeGameWithEngine,
  analyzeReviewPosition,
} from "@/lib/review/engine-analysis";
import type {
  AnalysisEngine,
  AnalysisUpdate,
  AnalyzeOptions,
  EngineLine,
  EngineId,
} from "@/lib/engine/types";

type FakePosition = {
  bestMove: string;
  lines: EngineLine[];
};

class FakeEngine implements AnalysisEngine {
  readonly id: EngineId = "stockfish";
  readonly calls: Array<{ fen: string; options: AnalyzeOptions }> = [];

  constructor(private readonly positions: Map<string, FakePosition>) {}

  async init(): Promise<void> {}

  analyze(
    fen: string,
    options: AnalyzeOptions,
    onUpdate: (update: AnalysisUpdate) => void,
  ): void {
    this.calls.push({ fen, options });
    const position = this.positions.get(fen);
    if (!position) {
      throw new Error(`Missing fake analysis for ${fen}`);
    }

    queueMicrotask(() => {
      onUpdate({
        fen,
        lines: position.lines,
        bestMove: position.bestMove,
        depth: position.lines[0]?.depth ?? 0,
        done: true,
      });
    });
  }

  stop(): void {}
  dispose(): void {}
}

function line(
  multipv: number,
  value: number,
  pv: string[],
): EngineLine {
  return {
    multipv,
    depth: 16,
    score: { type: "cp", value },
    pv,
  };
}

describe("engine-backed review analysis", () => {
  it("builds review data from a server-compatible UCI engine", async () => {
    const parsed = parsePgnForReview("1. e4 *");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const before = parsed.game.initialFen;
    const after = parsed.game.moves[0].fenAfter;
    const engine = new FakeEngine(
      new Map([
        [
          before,
          {
            bestMove: "e2e4",
            lines: [
              line(1, 32, ["e2e4", "e7e5"]),
              line(2, 18, ["d2d4", "d7d5"]),
            ],
          },
        ],
        [
          after,
          {
            bestMove: "e7e5",
            lines: [line(1, -10, ["e7e5", "g1f3"])],
          },
        ],
      ]),
    );

    const progress: number[] = [];
    const result = await analyzeGameWithEngine(parsed.game, engine, {
      analyzeOptions: { depth: 16, multiPV: 2, skill: 20 },
      onProgress: (update) => progress.push(update.current),
    });

    assert.deepEqual(
      engine.calls.map((call) => call.fen),
      [before, after],
    );
    assert.deepEqual(progress, [1, 2]);
    assert.equal(result.total, 2);
    assert.equal(result.current, 2);
    assert.equal(result.moves.length, 1);
    assert.equal(result.moves[0].bestMove, "e4");
    assert.equal(result.moves[0].bestMoveUci, "e2e4");
    assert.deepEqual(result.moves[0].bestLine, ["e4", "e5"]);
    assert.equal(result.moves[0].playedBestMove, true);
    assert.equal(result.moves[0].evalBefore?.value, 32);
    assert.equal(result.evalByPly[0].value, 10);
    assert.equal(result.moves[0].evalAfter?.value, 32);
    assert.equal(result.analysisByPly[-1].candidateMoves?.length, 2);
  });

  it("returns terminal scores without asking the engine to search", async () => {
    const parsed = parsePgnForReview("1. f3 e5 2. g4 Qh4# 0-1");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const finalFen = parsed.game.moves.at(-1)?.fenAfter;
    assert.equal(typeof finalFen, "string");
    if (!finalFen) return;

    const engine = new FakeEngine(new Map());
    const analysis = await analyzeReviewPosition(engine, finalFen, {
      depth: 16,
    });

    assert.deepEqual(analysis.score, { type: "mate", value: -1 });
    assert.equal(engine.calls.length, 0);
  });
});
