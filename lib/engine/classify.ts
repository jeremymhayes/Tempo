import type { MoveClassification } from "@/types/review";
import type { WhiteScore } from "./eval-format";

const MATE_CP = 100_000;
const BEST_LOSS = 10;
const EXCELLENT_LOSS = 30;
const GOOD_LOSS = 60;
const INACCURACY_LOSS = 125;
const MISTAKE_LOSS = 300;
const MISS_MIN_LOSS = 300;
const MISS_MIN_WIN_CHANCE_LOSS = 10;
const WINNING_ADVANTAGE = 300;
const STILL_PLAYABLE = -100;
const SOUND_SACRIFICE_MIN_ADVANTAGE = 150;
const BRILLIANT_MAX_PRE_MOVE_ADVANTAGE = 800;
const GREAT_SWING = 250;
const GREAT_MIN_WIN_CHANCE_GAIN = 10;
const GREAT_LOSING_MAX_WIN_CHANCE = 40;
const GREAT_EQUAL_MIN_WIN_CHANCE = 45;
const GREAT_EQUAL_MAX_WIN_CHANCE = 55;
const GREAT_WINNING_MIN_WIN_CHANCE = 65;
const WIN_CHANCE_K = 0.0044;

const LOSS_ORDER = [
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
] as const satisfies MoveClassification[];

export type ClassifyEngineMoveInput = {
  before: WhiteScore;
  after: WhiteScore;
  mover: "w" | "b";
  book?: boolean;
  san?: string;
  captured?: boolean;
  playedBestMove?: boolean;
  onlyMove?: boolean;
  sacrifice?: boolean;
};

function toCp(score: WhiteScore): number {
  if (score.type === "mate") {
    return score.value > 0 ? MATE_CP - score.value : -MATE_CP - score.value;
  }
  return score.value;
}

function moverCp(score: WhiteScore, mover: "w" | "b"): number {
  const cp = toCp(score);
  return mover === "w" ? cp : -cp;
}

function hasForcedMate(score: WhiteScore, mover: "w" | "b"): boolean {
  return (
    score.type === "mate" &&
    ((mover === "w" && score.value > 0) ||
      (mover === "b" && score.value < 0))
  );
}

function whiteWinChance(score: WhiteScore): number {
  if (score.type === "mate") return score.value >= 0 ? 100 : 0;
  return 100 / (1 + Math.exp(-WIN_CHANCE_K * score.value));
}

function moverWinChance(score: WhiteScore, mover: "w" | "b"): number {
  const white = whiteWinChance(score);
  return mover === "w" ? white : 100 - white;
}

function isGreatOutcomeShift(before: WhiteScore, after: WhiteScore, mover: "w" | "b") {
  const beforeChance = moverWinChance(before, mover);
  const afterChance = moverWinChance(after, mover);
  if (afterChance - beforeChance < GREAT_MIN_WIN_CHANCE_GAIN) return false;

  const rescuedLosingPosition =
    beforeChance <= GREAT_LOSING_MAX_WIN_CHANCE &&
    afterChance >= GREAT_EQUAL_MIN_WIN_CHANCE;
  const convertedEqualPosition =
    beforeChance >= GREAT_EQUAL_MIN_WIN_CHANCE &&
    beforeChance <= GREAT_EQUAL_MAX_WIN_CHANCE &&
    afterChance >= GREAT_WINNING_MIN_WIN_CHANCE;

  return rescuedLosingPosition || convertedEqualPosition;
}

/** Centipawns the mover lost versus the prior best eval (>= 0). */
export function centipawnLoss(
  before: WhiteScore,
  after: WhiteScore,
  mover: "w" | "b",
): number {
  const b = toCp(before);
  const a = toCp(after);
  const loss = mover === "w" ? b - a : a - b;
  return Math.max(0, loss);
}

export function winChanceLoss(
  before: WhiteScore,
  after: WhiteScore,
  mover: "w" | "b",
): number {
  return Math.max(0, moverWinChance(before, mover) - moverWinChance(after, mover));
}

function classifyCentipawnLoss(loss: number): MoveClassification {
  if (loss <= BEST_LOSS) return "best";
  if (loss <= EXCELLENT_LOSS) return "excellent";
  if (loss <= GOOD_LOSS) return "good";
  if (loss <= INACCURACY_LOSS) return "inaccuracy";
  if (loss <= MISTAKE_LOSS) return "mistake";
  return "blunder";
}

function classifyWinChanceLoss(loss: number): MoveClassification {
  if (loss <= 1) return "best";
  if (loss <= 2.5) return "excellent";
  if (loss <= 5) return "good";
  if (loss <= 10) return "inaccuracy";
  if (loss <= 20) return "mistake";
  return "blunder";
}

function lossIndex(classification: MoveClassification): number {
  return LOSS_ORDER.indexOf(classification as (typeof LOSS_ORDER)[number]);
}

function softerLoss(
  raw: MoveClassification,
  practical: MoveClassification,
): MoveClassification {
  const rawIndex = lossIndex(raw);
  const practicalIndex = lossIndex(practical);
  if (rawIndex < 0 || practicalIndex < 0) return raw;
  return LOSS_ORDER[Math.min(rawIndex, practicalIndex)];
}

function harsherLoss(
  raw: MoveClassification,
  practical: MoveClassification,
): MoveClassification {
  const rawIndex = lossIndex(raw);
  const practicalIndex = lossIndex(practical);
  if (rawIndex < 0 || practicalIndex < 0) return raw;
  return LOSS_ORDER[Math.max(rawIndex, practicalIndex)];
}

export function classifyLoss(
  loss: number,
  practicalLoss?: number,
): MoveClassification {
  const raw = classifyCentipawnLoss(loss);
  if (typeof practicalLoss !== "number") return raw;

  let practical = classifyWinChanceLoss(practicalLoss);
  if (lossIndex(practical) > lossIndex(raw)) {
    return harsherLoss(raw, practical);
  }

  if (loss > GOOD_LOSS && lossIndex(practical) < lossIndex("good")) {
    practical = "good";
  }
  return softerLoss(raw, practical);
}

export function classifyEngineMove({
  before,
  after,
  mover,
  book = false,
  san,
  playedBestMove,
  onlyMove = false,
  sacrifice = false,
}: ClassifyEngineMoveInput): MoveClassification {
  if (book) return "book";

  const loss = centipawnLoss(before, after, mover);
  const practicalLoss = winChanceLoss(before, after, mover);
  const beforeForMover = moverCp(before, mover);
  const afterForMover = moverCp(after, mover);
  const swing = afterForMover - beforeForMover;
  const lostForcedMate = hasForcedMate(before, mover) && !hasForcedMate(after, mover);

  if (lostForcedMate && afterForMover >= STILL_PLAYABLE) {
    return "miss";
  }

  if (
    loss >= MISS_MIN_LOSS &&
    practicalLoss >= MISS_MIN_WIN_CHANCE_LOSS &&
    beforeForMover >= WINNING_ADVANTAGE &&
    afterForMover >= STILL_PLAYABLE
  ) {
    return "miss";
  }

  if (
    loss <= BEST_LOSS &&
    playedBestMove !== false &&
    sacrifice &&
    beforeForMover < BRILLIANT_MAX_PRE_MOVE_ADVANTAGE &&
    (swing >= GREAT_SWING || afterForMover >= SOUND_SACRIFICE_MIN_ADVANTAGE)
  ) {
    return "brilliant";
  }

  if (loss <= BEST_LOSS && playedBestMove !== false && onlyMove) {
    return "great";
  }

  if (
    loss <= BEST_LOSS &&
    (swing >= GREAT_SWING ||
      san?.includes("#") ||
      isGreatOutcomeShift(before, after, mover))
  ) {
    return "great";
  }

  if (loss <= BEST_LOSS && playedBestMove === false) {
    return "excellent";
  }

  return classifyLoss(loss, practicalLoss);
}
