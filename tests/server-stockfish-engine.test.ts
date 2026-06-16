import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { DEFAULT_POSITION } from "chess.js";
import type { AnalysisUpdate } from "@/lib/engine/types";
import {
  getStockfishSpawnConfig,
  getStockfishScriptPath,
  ServerStockfishEngine,
} from "@/lib/engine/server-stockfish-engine";

describe("server Stockfish engine", () => {
  it("resolves a concrete Stockfish script from the installed package", () => {
    const scriptPath = getStockfishScriptPath("lite-single");

    assert.equal(scriptPath.endsWith("stockfish-18-lite-single.js"), true);
    assert.equal(existsSync(scriptPath), true);
  });

  it("uses a native Stockfish binary when a binary path is configured", () => {
    assert.deepEqual(
      getStockfishSpawnConfig({
        binaryPath: "/usr/games/stockfish",
        flavor: "single",
      }),
      {
        command: "/usr/games/stockfish",
        args: [],
      },
    );
  });

  it("analyzes through the server UCI engine", async () => {
    const engine = new ServerStockfishEngine("lite-single", 10_000);
    await engine.init();

    try {
      const update = await new Promise<AnalysisUpdate>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Timed out waiting for Stockfish.")),
          10_000,
        );

        engine.analyze(
          DEFAULT_POSITION,
          { depth: 1, multiPV: 1, skill: 20 },
          (value) => {
            if (!value.done) return;
            clearTimeout(timer);
            resolve(value);
          },
        );
      });

      assert.equal(typeof update, "object");
      assert.equal(update.bestMove?.length, 4);
      assert.equal(update.lines.length, 1);
    } finally {
      engine.dispose();
    }
  });

  it("waits for Stockfish to answer after a search timeout sends stop", async () => {
    const engine = new ServerStockfishEngine("lite-single", 1);
    await engine.init();

    try {
      const update = await new Promise<AnalysisUpdate>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Timed out waiting for stopped Stockfish.")),
          10_000,
        );

        engine.analyze(
          DEFAULT_POSITION,
          { depth: 20, multiPV: 1, skill: 20 },
          (value) => {
            if (!value.done) return;
            clearTimeout(timer);
            resolve(value);
          },
        );
      });

      assert.equal(update.lines.length, 1);
      assert.equal(typeof update.lines[0]?.score, "object");
      assert.equal(update.bestMove?.length, 4);
    } finally {
      engine.dispose();
    }
  });
});
