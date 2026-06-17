import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getServerAnalysisConfig,
  isServerAnalysisEnabled,
} from "@/lib/review/server-analysis-config";
import { serverAnalysisFailurePayload } from "@/lib/review/server-analysis-error";
import { tryAcquireServerAnalysisSlot } from "@/lib/review/server-analysis-limiter";
import { readAnalysisPgnBody } from "@/lib/review/server-analysis-request";

describe("server analysis configuration", () => {
  it("requires an explicit opt-in flag", () => {
    assert.equal(isServerAnalysisEnabled({}), false);
    assert.equal(
      isServerAnalysisEnabled({ TEMPO_SERVER_ANALYSIS_ENABLED: "false" }),
      false,
    );
    assert.equal(
      isServerAnalysisEnabled({ TEMPO_SERVER_ANALYSIS_ENABLED: "true" }),
      true,
    );
    assert.equal(
      isServerAnalysisEnabled({ TEMPO_SERVER_ANALYSIS_ENABLED: "1" }),
      true,
    );
  });

  it("clamps engine settings from the environment", () => {
    const config = getServerAnalysisConfig({
      TEMPO_SERVER_ANALYSIS_ENABLED: "true",
      TEMPO_SERVER_ANALYSIS_DEPTH: "99",
      TEMPO_SERVER_ANALYSIS_MOVETIME_MS: "999999",
      TEMPO_SERVER_ANALYSIS_NODES: "999999999",
      TEMPO_SERVER_ANALYSIS_MULTI_PV: "9",
      TEMPO_SERVER_ANALYSIS_SKILL: "-3",
      TEMPO_SERVER_ANALYSIS_MAX_MOVES: "0",
      TEMPO_SERVER_ANALYSIS_MAX_PGN_LENGTH: "25",
      TEMPO_SERVER_ANALYSIS_MAX_CONCURRENT: "9",
      TEMPO_SERVER_STOCKFISH_FLAVOR: "single",
      TEMPO_SERVER_STOCKFISH_PATH: "/usr/games/stockfish",
      TEMPO_SERVER_STOCKFISH_THREADS: "99",
      TEMPO_SERVER_STOCKFISH_HASH_MB: "99999",
    });

    assert.equal(config.enabled, true);
    assert.equal(config.analyzeOptions.depth, 40);
    assert.equal(config.analyzeOptions.movetime, 10_000);
    assert.equal(config.analyzeOptions.nodes, 50_000_000);
    assert.equal(config.analyzeOptions.multiPV, 5);
    assert.equal(config.analyzeOptions.skill, 0);
    assert.equal(config.maxMoves, 1);
    assert.equal(config.maxPgnLength, 25);
    assert.equal(config.maxConcurrent, 4);
    assert.equal(config.stockfishFlavor, "single");
    assert.equal(config.stockfishPath, "/usr/games/stockfish");
    assert.equal(config.stockfishThreads, 32);
    assert.equal(config.stockfishHashMb, 4096);
  });

  it("uses a stronger depth by default for server analysis", () => {
    const config = getServerAnalysisConfig({
      TEMPO_SERVER_ANALYSIS_ENABLED: "true",
    });

    assert.equal(config.analyzeOptions.depth, 20);
    assert.equal(config.analyzeOptions.movetime, undefined);
    assert.equal(config.analyzeOptions.nodes, undefined);
    assert.equal(config.analyzeOptions.multiPV, 3);
    assert.equal(config.analyzeOptions.skill, 20);
    assert.equal(config.stockfishFlavor, "single");
    assert.equal(config.stockfishPath, null);
    assert.equal(config.stockfishThreads, null);
    assert.equal(config.stockfishHashMb, null);
  });
});

describe("server analysis request body", () => {
  it("extracts PGN from a valid request body", () => {
    assert.deepEqual(readAnalysisPgnBody({ pgn: "1. e4 *" }, 100), {
      ok: true,
      pgn: "1. e4 *",
    });
  });

  it("rejects malformed or oversized PGN bodies", () => {
    assert.deepEqual(readAnalysisPgnBody({}, 100), {
      ok: false,
      status: 400,
      error: "PGN is required",
    });
    assert.deepEqual(readAnalysisPgnBody({ pgn: "x".repeat(6) }, 5), {
      ok: false,
      status: 413,
      error: "PGN is too large for server analysis",
    });
  });
});

describe("server analysis error payload", () => {
  it("includes a concise reason for client diagnostics", () => {
    assert.deepEqual(
      serverAnalysisFailurePayload(new Error("Engine timed out during ready.")),
      {
        error: "Server analysis failed",
        reason: "Engine timed out during ready.",
      },
    );
  });
});

describe("server analysis concurrency limiter", () => {
  it("rejects excess work until an active analysis releases its slot", () => {
    const first = tryAcquireServerAnalysisSlot(1);
    assert.notEqual(first, null);

    try {
      assert.equal(tryAcquireServerAnalysisSlot(1), null);
    } finally {
      first?.release();
    }

    const afterRelease = tryAcquireServerAnalysisSlot(1);
    assert.notEqual(afterRelease, null);
    afterRelease?.release();
  });
});
