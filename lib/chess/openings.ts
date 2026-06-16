import type { GameMove } from "@/types/chess";

export type OpeningBreakdown = {
  eco: string | null;
  name: string;
  matchedPlyCount: number;
  bookLastPly: number | null;
  bookExitPly: number | null;
  bookExitMove: string | null;
};

type OpeningLine = {
  eco: string;
  name: string;
  moves: string[];
};

const OPENING_LINES: OpeningLine[] = [
  { eco: "C41", name: "Philidor Defense", moves: ["e4", "e5", "Nf3", "d6"] },
  { eco: "C60", name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
  { eco: "C50", name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { eco: "B20", name: "Sicilian Defense", moves: ["e4", "c5"] },
  { eco: "B01", name: "Scandinavian Defense", moves: ["e4", "d5"] },
  { eco: "C00", name: "French Defense", moves: ["e4", "e6"] },
  { eco: "B00", name: "Caro-Kann Defense", moves: ["e4", "c6"] },
  { eco: "D06", name: "Queen's Gambit", moves: ["d4", "d5", "c4"] },
  { eco: "D00", name: "Queen's Pawn Game", moves: ["d4", "d5"] },
  { eco: "A45", name: "Indian Game", moves: ["d4", "Nf6"] },
  { eco: "A10", name: "English Opening", moves: ["c4"] },
  { eco: "A04", name: "Reti Opening", moves: ["Nf3"] },
].sort((a, b) => b.moves.length - a.moves.length);

function normalizeSan(san: string): string {
  return san.replace(/[+#?!]+/g, "");
}

function formatMove(move: GameMove): string {
  return move.color === "w"
    ? `${move.moveNumber}. ${move.san}`
    : `${move.moveNumber}... ${move.san}`;
}

function matchesLine(moves: GameMove[], line: OpeningLine): boolean {
  if (moves.length < line.moves.length) return false;
  return line.moves.every((san, index) => normalizeSan(moves[index].san) === san);
}

export function deriveOpeningBreakdown(moves: GameMove[]): OpeningBreakdown {
  const line = OPENING_LINES.find((candidate) => matchesLine(moves, candidate));

  if (!line) {
    const firstMove = moves[0] ?? null;
    return {
      eco: null,
      name: "Unclassified Opening",
      matchedPlyCount: 0,
      bookLastPly: null,
      bookExitPly: firstMove ? firstMove.ply : null,
      bookExitMove: firstMove ? formatMove(firstMove) : null,
    };
  }

  const bookLastPly = line.moves.length - 1;
  const exitMove = moves[bookLastPly + 1] ?? null;

  return {
    eco: line.eco,
    name: line.name,
    matchedPlyCount: line.moves.length,
    bookLastPly,
    bookExitPly: exitMove ? exitMove.ply : null,
    bookExitMove: exitMove ? formatMove(exitMove) : null,
  };
}
