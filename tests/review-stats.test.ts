import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameMove } from "@/types/chess";
import {
  buildReviewStats,
  type ReviewListMove,
  estimateGameRating,
  moveAccuracyFromLoss,
  shouldShowMoveIcon,
  toMovePairs,
} from "@/lib/review/review-stats";
import { CLASS_ORDER } from "@/lib/review/classification-meta";
import { shouldShowBestMoveHint } from "@/lib/review/best-move-hint";
import { buildMoveInsight } from "@/lib/review/move-insight";
import {
  buildEngineReviewedMoves,
  evalByPlyFromAnalysis,
  terminalWhiteScore,
} from "@/lib/review/deep-analysis";
import { classifyEngineMove, classifyLoss } from "@/lib/engine/classify";

type GameMoveWithClass = GameMove & {
  classification?:
    | "brilliant"
    | "great"
    | "book"
    | "best"
    | "excellent"
    | "good"
    | "inaccuracy"
    | "mistake"
    | "miss"
    | "blunder";
};

function move(
  ply: number,
  san: string,
  color: "w" | "b",
  classification?: GameMoveWithClass["classification"],
  lan = "",
): GameMoveWithClass {
  return {
    ply,
    san,
    color,
    moveNumber: Math.floor(ply / 2) + 1,
    lan,
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
      move(4, "d4", "w", "excellent"),
      move(5, "Bg4", "b", "blunder"),
    ]);

    assert.equal(stats.counts.white.book, 1);
    assert.equal(stats.counts.white.great, 1);
    assert.equal(stats.counts.white.excellent, 1);
    assert.equal(stats.counts.black.best, 1);
    assert.equal(stats.counts.black.mistake, 1);
    assert.equal(stats.counts.black.blunder, 1);
    assert.equal(stats.accuracy.white, 98);
    assert.equal(stats.accuracy.black, 57.7);
    assert.equal(stats.rating.white, 1720);
    assert.equal(stats.rating.black, 956);
  });

  it("estimates game ratings from accuracy", () => {
    assert.equal(estimateGameRating(86.4), 1546);
    assert.equal(
      estimateGameRating(86.4, { mistake: 1, miss: 1 }),
      1411,
    );
    assert.equal(estimateGameRating(undefined), undefined);
  });

  it("shows move-list icons only for standout and serious mistake classes", () => {
    assert.equal(shouldShowMoveIcon("brilliant"), true);
    assert.equal(shouldShowMoveIcon("great"), true);
    assert.equal(shouldShowMoveIcon("mistake"), true);
    assert.equal(shouldShowMoveIcon("miss"), true);
    assert.equal(shouldShowMoveIcon("blunder"), true);
    assert.equal(shouldShowMoveIcon("best"), false);
    assert.equal(shouldShowMoveIcon("book"), false);
    assert.equal(shouldShowMoveIcon("excellent"), false);
    assert.equal(shouldShowMoveIcon("good"), false);
    assert.equal(shouldShowMoveIcon("inaccuracy"), false);
    assert.equal(shouldShowMoveIcon(undefined), false);
  });

  it("shows best-move hints only for actionable inaccuracies or worse", () => {
    assert.equal(
      shouldShowBestMoveHint({
        san: "Qh5",
        bestMove: "Nf3",
        classification: "mistake",
      }),
      true,
    );
    assert.equal(
      shouldShowBestMoveHint({
        san: "Nf3",
        bestMove: "Nf3",
        classification: "best",
      }),
      false,
    );
    assert.equal(
      shouldShowBestMoveHint({
        san: "e4",
        bestMove: "d4",
        classification: "excellent",
      }),
      false,
    );
    assert.equal(shouldShowBestMoveHint(null), false);
  });

  it("builds actionable move insight with eval swing and best line", () => {
    const insight = buildMoveInsight({
      ...move(11, "Nf6", "b", "inaccuracy"),
      bestMove: "Qf6",
      bestLine: ["Qf6", "Qxf6", "Nxf6"],
      centipawnLoss: 88,
      evalBefore: { type: "cp", value: 5 },
      evalAfter: { type: "cp", value: 223 },
    } satisfies ReviewListMove);

    assert.deepEqual(insight, {
      moveLabel: "6... Nf6",
      classificationLabel: "Inaccuracy",
      headline: "Stockfish preferred Qf6.",
      details: [
        "Eval +0.05 -> +2.23",
        "Centipawn loss 88",
        "Line Qf6 Qxf6 Nxf6",
      ],
    });
  });

  it("builds brilliant sacrifice insight", () => {
    const insight = buildMoveInsight({
      ...move(0, "Bxf7+", "w", "brilliant"),
      bestMove: "Bxf7+",
      bestLine: ["Bxf7+", "Ke7", "Qh5"],
      playedBestMove: true,
      isSacrifice: true,
      centipawnLoss: 0,
      evalBefore: { type: "cp", value: 0 },
      evalAfter: { type: "cp", value: 500 },
    } satisfies ReviewListMove);

    assert.equal(insight?.headline, "Engine-best tactical sacrifice.");
    assert.deepEqual(insight?.details, [
      "Eval 0.00 -> +5.00",
      "Centipawn loss 0",
      "Line Bxf7+ Ke7 Qh5",
    ]);
  });

  it("builds quiet book and best move insights without fake best-line advice", () => {
    assert.equal(buildMoveInsight(null), null);
    assert.equal(
      buildMoveInsight(move(0, "e4", "w", "book"))?.headline,
      "Opening book move.",
    );
    assert.equal(
      buildMoveInsight({
        ...move(2, "Nf3", "w", "best"),
        playedBestMove: true,
      })?.headline,
      "Matched Stockfish's preferred line.",
    );
  });

  it("adds practical win-chance loss to insight for large engine drops", () => {
    const insight = buildMoveInsight({
      ...move(0, "Kf1", "w", "good"),
      centipawnLoss: 800,
      evalBefore: { type: "cp", value: 2000 },
      evalAfter: { type: "cp", value: 1200 },
    } satisfies ReviewListMove);

    assert.ok(insight?.details.includes("Win chance loss 0.5%"));
  });

  it("explains missed forced mates directly", () => {
    const insight = buildMoveInsight({
      ...move(0, "Qh5", "w", "miss"),
      bestMove: "Qh7#",
      bestLine: ["Qh7#"],
      centipawnLoss: 99099,
      evalBefore: { type: "mate", value: 1 },
      evalAfter: { type: "cp", value: 900 },
    } satisfies ReviewListMove);

    assert.equal(insight?.headline, "Missed a forced mate.");
    assert.ok(insight?.details.includes("Eval M1 -> +9.00"));
    assert.ok(insight?.details.includes("Line Qh7#"));
  });

  it("uses the full Chess.com-style move quality order", () => {
    assert.deepEqual(CLASS_ORDER, [
      "brilliant",
      "great",
      "book",
      "best",
      "excellent",
      "good",
      "inaccuracy",
      "mistake",
      "miss",
      "blunder",
    ]);
  });

  it("classifies centipawn loss with a fuller quality ladder", () => {
    assert.equal(classifyLoss(0), "best");
    assert.equal(classifyLoss(18), "excellent");
    assert.equal(classifyLoss(45), "good");
    assert.equal(classifyLoss(90), "inaccuracy");
    assert.equal(classifyLoss(180), "mistake");
    assert.equal(classifyLoss(450), "blunder");
  });

  it("uses practical loss severity around equal positions", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 50 },
        after: { type: "cp", value: -50 },
        mover: "w",
      }),
      "mistake",
    );
  });

  it("uses the engine best move to separate Best from Excellent", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 20 },
        after: { type: "cp", value: 15 },
        mover: "w",
        playedBestMove: true,
      }),
      "best",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 20 },
        after: { type: "cp", value: 15 },
        mover: "w",
        playedBestMove: false,
      }),
      "excellent",
    );
  });

  it("marks engine-best only moves as Great", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 0 },
        after: { type: "cp", value: 0 },
        mover: "w",
        playedBestMove: true,
        onlyMove: true,
      }),
      "great",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 0 },
        after: { type: "cp", value: -8 },
        mover: "w",
        playedBestMove: false,
        onlyMove: true,
      }),
      "excellent",
    );
  });

  it("marks critical outcome shifts as Great", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: -250 },
        after: { type: "cp", value: -20 },
        mover: "w",
        playedBestMove: true,
      }),
      "great",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 20 },
        after: { type: "cp", value: 260 },
        mover: "w",
        playedBestMove: true,
      }),
      "great",
    );
  });

  it("reserves Brilliant for engine-best tactical sacrifices", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 0 },
        after: { type: "cp", value: 500 },
        mover: "w",
        playedBestMove: true,
        sacrifice: true,
      }),
      "brilliant",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 0 },
        after: { type: "cp", value: 500 },
        mover: "w",
        playedBestMove: true,
      }),
      "great",
    );
  });

  it("does not trust PGN punctuation alone for Brilliant", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 20 },
        after: { type: "cp", value: 15 },
        mover: "w",
        playedBestMove: true,
        san: "Nf3!!",
      }),
      "best",
    );
  });

  it("keeps equivalent checkmates as Great instead of downgrading to Excellent", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 0 },
        after: { type: "mate", value: 1 },
        mover: "w",
        playedBestMove: false,
        san: "Qh7#",
      }),
      "great",
    );
  });

  it("marks sound engine-best sacrifices as Brilliant even without a huge swing", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 620 },
        after: { type: "cp", value: 630 },
        mover: "w",
        playedBestMove: true,
        sacrifice: true,
      }),
      "brilliant",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: -620 },
        after: { type: "cp", value: -630 },
        mover: "b",
        playedBestMove: true,
        sacrifice: true,
      }),
      "brilliant",
    );
  });

  it("does not award Brilliant when already completely winning", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 900 },
        after: { type: "cp", value: 920 },
        mover: "w",
        playedBestMove: true,
        sacrifice: true,
      }),
      "best",
    );
  });

  it("detects missed winning chances separately from raw blunders", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 900 },
        after: { type: "cp", value: 80 },
        mover: "w",
      }),
      "miss",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: -850 },
        after: { type: "cp", value: -50 },
        mover: "b",
      }),
      "miss",
    );
  });

  it("marks missed chances to gain a winning position as Miss", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 350 },
        after: { type: "cp", value: 0 },
        mover: "w",
      }),
      "miss",
    );
  });

  it("treats losing a forced mate as a Miss even when still winning", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "mate", value: 1 },
        after: { type: "cp", value: 900 },
        mover: "w",
      }),
      "miss",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "mate", value: -1 },
        after: { type: "cp", value: -900 },
        mover: "b",
      }),
      "miss",
    );
  });

  it("does not call fully decided conversion losses misses", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 2000 },
        after: { type: "cp", value: 1200 },
        mover: "w",
      }),
      "good",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: -2000 },
        after: { type: "cp", value: -1200 },
        mover: "b",
      }),
      "good",
    );
  });

  it("does not over-penalize centipawn losses in dead-lost positions", () => {
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: -1200 },
        after: { type: "cp", value: -2000 },
        mover: "w",
      }),
      "good",
    );
    assert.equal(
      classifyEngineMove({
        before: { type: "cp", value: 1200 },
        after: { type: "cp", value: 2000 },
        mover: "b",
      }),
      "good",
    );
  });

  it("uses centipawn loss for accuracy when engine loss is available", () => {
    const perfect = moveAccuracyFromLoss(0);
    const smallLoss = moveAccuracyFromLoss(35);
    const largeLoss = moveAccuracyFromLoss(450);

    assert.equal(perfect, 100);
    assert.ok(smallLoss < perfect);
    assert.ok(smallLoss > 90);
    assert.ok(largeLoss < 40);

    const stats = buildReviewStats([
      { ...move(0, "e4", "w", "best"), centipawnLoss: 0 },
      { ...move(2, "Nf3", "w", "good"), centipawnLoss: 35 },
      { ...move(1, "c5", "b", "blunder"), centipawnLoss: 450 },
    ]);

    assert.equal(stats.accuracy.white, 96.3);
    assert.equal(stats.accuracy.black, 30.8);
  });

  it("uses practical win-chance loss for accuracy when evals are available", () => {
    const stats = buildReviewStats([
      {
        ...move(0, "Kf1", "w", "good"),
        centipawnLoss: 800,
        evalBefore: { type: "cp", value: 2000 },
        evalAfter: { type: "cp", value: 1200 },
      },
      {
        ...move(1, "Kf8", "b", "good"),
        centipawnLoss: 800,
        evalBefore: { type: "cp", value: -2000 },
        evalAfter: { type: "cp", value: -1200 },
      },
    ] satisfies ReviewListMove[]);

    assert.ok((stats.accuracy.white ?? 0) > 95);
    assert.ok((stats.accuracy.black ?? 0) > 95);
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

  it("preserves opening book moves when classifying engine swings", () => {
    const reviewed = buildEngineReviewedMoves(
      [
        move(0, "e4", "w"),
        move(1, "c5", "b"),
        move(2, "Nf3", "w"),
      ],
      {
        [-1]: { type: "cp", value: 20 },
        0: { type: "cp", value: 12 },
        1: { type: "cp", value: 30 },
        2: { type: "cp", value: 26 },
      },
      { bookLastPly: 1 },
    );

    assert.equal(reviewed[0].classification, "book");
    assert.equal(reviewed[1].classification, "book");
    assert.equal(reviewed[2].classification, "best");
  });

  it("attaches best move context from the analyzed pre-position", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 20 },
        bestMove: "d2d4",
        bestMoveSan: "d4",
        bestLineSan: ["d4", "d5", "c4"],
        depth: 16,
      },
      0: {
        score: { type: "cp", value: 15 },
        bestMove: "g8f6",
        bestMoveSan: "Nf6",
        bestLineSan: ["Nf6"],
        depth: 16,
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [move(0, "e4", "w", undefined, "e2e4")],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].bestMove, "d4");
    assert.equal(reviewed[0].bestMoveUci, "d2d4");
    assert.deepEqual(reviewed[0].bestLine, ["d4", "d5", "c4"]);
    assert.equal(reviewed[0].playedBestMove, false);
    assert.equal(reviewed[0].classification, "excellent");
  });

  it("accepts equivalent MultiPV candidate moves as Best", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 20 },
        bestMove: "d2d4",
        bestMoveSan: "d4",
        candidateMoves: [
          {
            move: "d2d4",
            san: "d4",
            score: { type: "cp", value: 20 },
          },
          {
            move: "e2e4",
            san: "e4",
            score: { type: "cp", value: 15 },
          },
        ],
      },
      0: {
        score: { type: "cp", value: 15 },
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [move(0, "e4", "w", undefined, "e2e4")],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].bestMove, "d4");
    assert.equal(reviewed[0].bestMoveUci, "d2d4");
    assert.equal(reviewed[0].playedBestMove, true);
    assert.equal(reviewed[0].classification, "best");
  });

  it("uses MultiPV alternatives to detect only moves as Great", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 0 },
        bestMove: "e2e4",
        bestMoveSan: "e4",
        candidateMoves: [
          {
            move: "e2e4",
            san: "e4",
            score: { type: "cp", value: 0 },
          },
          {
            move: "d2d4",
            san: "d4",
            score: { type: "cp", value: -220 },
          },
          {
            move: "g1f3",
            san: "Nf3",
            score: { type: "cp", value: -260 },
          },
        ],
      },
      0: {
        score: { type: "cp", value: 0 },
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [move(0, "e4", "w", undefined, "e2e4")],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].playedBestMove, true);
    assert.equal(reviewed[0].onlyMove, true);
    assert.equal(reviewed[0].classification, "great");
  });

  it("marks exact engine-best moves as Best when the loss is near zero", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 20 },
        bestMove: "e2e4",
        bestMoveSan: "e4",
        bestLineSan: ["e4", "c5"],
        depth: 16,
      },
      0: {
        score: { type: "cp", value: 15 },
        bestMove: "c7c5",
        bestMoveSan: "c5",
        bestLineSan: ["c5"],
        depth: 16,
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [move(0, "e4", "w", undefined, "e2e4")],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].bestMove, "e4");
    assert.equal(reviewed[0].playedBestMove, true);
    assert.equal(reviewed[0].classification, "best");
  });

  it("uses the pre-move candidate score for best-move classification", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 20 },
        bestMove: "e2e4",
        bestMoveSan: "e4",
        candidateMoves: [
          {
            move: "e2e4",
            san: "e4",
            score: { type: "cp", value: 20 },
          },
        ],
      },
      0: {
        score: { type: "cp", value: -80 },
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [move(0, "e4", "w", undefined, "e2e4")],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].playedBestMove, true);
    assert.equal(reviewed[0].classification, "best");
    assert.equal(reviewed[0].centipawnLoss, 0);
    assert.deepEqual(reviewed[0].evalAfter, { type: "cp", value: 20 });
  });

  it("detects likely sacrifices from the played move landing on an attacked square", () => {
    const analysisByPly = {
      [-1]: {
        score: { type: "cp", value: 0 },
        bestMove: "c4f7",
        bestMoveSan: "Bxf7+",
        bestLineSan: ["Bxf7+", "Ke7"],
      },
      0: {
        score: { type: "cp", value: 500 },
      },
    } as const;

    const reviewed = buildEngineReviewedMoves(
      [
        {
          ...move(0, "Bxf7+", "w", undefined, "c4f7"),
          from: "c4",
          to: "f7",
          captured: "p",
          fenAfter:
            "rnbqkbnr/pppp1Bpp/8/4p3/4P3/8/PPPP1PPP/RN1QKBNR b KQkq - 0 3",
        },
      ],
      evalByPlyFromAnalysis(analysisByPly),
      { analysisByPly },
    );

    assert.equal(reviewed[0].isSacrifice, true);
    assert.equal(reviewed[0].classification, "brilliant");
  });

  it("scores terminal checkmate positions without Stockfish output", () => {
    const score = terminalWhiteScore(
      "1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17",
    );

    assert.deepEqual(score, { type: "mate", value: 1 });
  });
});
