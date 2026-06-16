import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateRemainingSeconds,
  formatAnalysisEta,
  progressPercent,
} from "@/lib/review/analysis-progress";

describe("review analysis progress UI helpers", () => {
  it("calculates a clamped progress percentage", () => {
    assert.equal(progressPercent(0, 35), 0);
    assert.equal(progressPercent(7, 35), 20);
    assert.equal(progressPercent(40, 35), 100);
    assert.equal(progressPercent(1, 0), 0);
  });

  it("estimates remaining time from completed positions", () => {
    assert.equal(
      estimateRemainingSeconds({
        current: 4,
        total: 10,
        startedAtMs: 1_000,
        nowMs: 21_000,
      }),
      30,
    );
  });

  it("formats ETA text for loading UI", () => {
    assert.equal(formatAnalysisEta(null), "Estimating");
    assert.equal(formatAnalysisEta(0), "Finishing");
    assert.equal(formatAnalysisEta(12), "12s");
    assert.equal(formatAnalysisEta(75), "1m 15s");
    assert.equal(formatAnalysisEta(3_900), "1h 5m");
  });
});
