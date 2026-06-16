import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASSIFICATION_BADGE_SIZE_CLASS,
  getClassificationBadgeAnchor,
} from "@/components/chess/analysis-board";

describe("analysis board classification badge overlay", () => {
  it("anchors move feedback at the displayed top-right corner of the destination square", () => {
    assert.deepEqual(getClassificationBadgeAnchor("e4", "w"), {
      left: 62.5,
      top: 50,
    });
    assert.deepEqual(getClassificationBadgeAnchor("e4", "b"), {
      left: 50,
      top: 37.5,
    });
  });

  it("uses a badge size one-third larger than the previous centered marker", () => {
    assert.equal(
      CLASSIFICATION_BADGE_SIZE_CLASS,
      "size-[clamp(24px,4.5cqw,45px)] text-[clamp(12px,2.25cqw,20px)]",
    );
  });
});
