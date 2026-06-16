export const PRACTICE_BOT_ELOS = [
  400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400,
] as const;

export type PracticeBotElo = (typeof PRACTICE_BOT_ELOS)[number];

export type PracticeBotConfig = {
  elo: PracticeBotElo;
  skill: number;
  movetime: number;
  depth: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  return {
    elo,
    skill: Math.round(progress * 20),
    movetime: Math.round(220 + progress * 980),
    depth: Math.round(4 + progress * 10),
  };
}
