import type { Chess, Move } from "chess.js";
import type { EngineLine } from "@/lib/engine/types";

export const PRACTICE_BOT_ELOS = [
  400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400,
] as const;

export type PracticeBotElo = (typeof PRACTICE_BOT_ELOS)[number];

export type PracticeBotConfig = {
  elo: PracticeBotElo;
  skill: number;
  movetime: number;
  depth: number;
  nodes: number;
  multiPV: number;
  limitStrength: boolean;
  uciElo: number;
  humanMoveChance: number;
  mistakeMoveChance: number;
};

const STOCKFISH_MIN_ELO = 1320;
const STOCKFISH_MAX_PRACTICE_ELO = 2400;
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundChance(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeBotElo(value: number): PracticeBotElo {
  const min = PRACTICE_BOT_ELOS[0];
  const max = PRACTICE_BOT_ELOS[PRACTICE_BOT_ELOS.length - 1];
  const rounded = Math.round(clamp(value, min, max) / 200) * 200;
  return clamp(rounded, min, max) as PracticeBotElo;
}

export function eloToBotConfig(value: number): PracticeBotConfig {
  const elo = normalizeBotElo(value);
  const progress =
    (elo - PRACTICE_BOT_ELOS[0]) /
    (PRACTICE_BOT_ELOS[PRACTICE_BOT_ELOS.length - 1] - PRACTICE_BOT_ELOS[0]);
  const weakness = 1 - progress;

  return {
    elo,
    skill: Math.round(progress * 20),
    movetime: Math.round(80 + progress * 820),
    depth: Math.round(1 + progress * 11),
    nodes: Math.round(24 + progress * 8000),
    multiPV: Math.round(1 + weakness * 4),
    limitStrength: true,
    uciElo: Math.round(
      clamp(elo, STOCKFISH_MIN_ELO, STOCKFISH_MAX_PRACTICE_ELO),
    ),
    humanMoveChance: roundChance(0.6 * weakness * weakness),
    mistakeMoveChance: roundChance(0.35 * weakness),
  };
}

export function choosePracticeBotMove(
  chess: Chess,
  lines: EngineLine[],
  config: PracticeBotConfig,
  random = Math.random,
): string | null {
  const legalMoves = chess.moves({ verbose: true }).map(moveToUci);
  if (legalMoves.length === 0) return null;

  const legalVerboseMoves = chess.moves({ verbose: true });
  if (random() < config.humanMoveChance) {
    return chooseHumanMove(legalVerboseMoves, random);
  }

  const legalSet = new Set(legalMoves);
  const engineMoves = lines
    .map((line) => line.pv[0])
    .filter((move): move is string => Boolean(move && legalSet.has(move)));

  if (engineMoves.length === 0) return chooseHumanMove(legalVerboseMoves, random);

  if (engineMoves.length > 1 && random() < config.mistakeMoveChance) {
    return pick(engineMoves.slice(1, config.multiPV), random);
  }

  return engineMoves[0];
}

function moveToUci(move: Pick<Move, "from" | "to" | "promotion">) {
  return `${move.from}${move.to}${move.promotion ? String(move.promotion) : ""}`;
}

function chooseHumanMove(moves: Move[], random: () => number): string {
  const ranked = moves
    .map((move) => ({ move, score: humanMoveScore(move) }))
    .sort((a, b) => b.score - a.score);
  const bestScore = ranked[0]?.score ?? 0;
  const candidates = ranked
    .filter((item) => item.score >= bestScore - 35)
    .slice(0, 4);

  return moveToUci(pick(candidates.length ? candidates : ranked, random).move);
}

function humanMoveScore(move: Move): number {
  let score = 0;

  if (move.isCapture()) {
    score += PIECE_VALUES[move.captured ?? "p"];
    score += Math.max(0, PIECE_VALUES[move.captured ?? "p"] - PIECE_VALUES[move.piece]) / 8;
  }
  if (move.isPromotion()) score += PIECE_VALUES[move.promotion ?? "q"];
  if (move.san.includes("#")) score += 1000;
  else if (move.san.includes("+")) score += 140;
  if (move.isKingsideCastle() || move.isQueensideCastle()) score += 90;
  if (move.piece === "n") {
    const homeRank = move.color === "w" ? "1" : "8";
    if (move.from.endsWith(homeRank)) {
      if (/^[cf][36]$/.test(move.to)) score += 60;
      else if (/^[ah][36]$/.test(move.to)) score -= 35;
      else score += 25;
    }
  }
  if (move.piece === "b") {
    const homeRank = move.color === "w" ? "1" : "8";
    if (move.from.endsWith(homeRank)) score += 40;
  }
  if (move.piece === "p") {
    if (/^[de][45]$/.test(move.to)) score += 80;
    else if (/^[cf][45]$/.test(move.to)) score += 20;
  }
  if (move.piece === "k" && !move.isKingsideCastle() && !move.isQueensideCastle()) {
    score -= 45;
  }

  return score;
}

function pick<T>(items: T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}
