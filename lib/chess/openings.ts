import type { GameHeaders, GameMove, ParsedGame } from "@/types/chess";

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

type OpeningSource = GameMove[] | Pick<ParsedGame, "headers" | "moves">;

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

function cleanHeader(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOpeningName(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function sourceMoves(source: OpeningSource): GameMove[] {
  return Array.isArray(source) ? source : source.moves;
}

function sourceHeaders(source: OpeningSource): GameHeaders {
  return Array.isArray(source) ? {} : source.headers;
}

function breakdownForBookEnd(
  moves: GameMove[],
  name: string,
  eco: string | null,
  bookLastPly: number | null,
): OpeningBreakdown {
  const exitMove =
    typeof bookLastPly === "number" ? (moves[bookLastPly + 1] ?? null) : null;

  return {
    eco,
    name,
    matchedPlyCount: typeof bookLastPly === "number" ? bookLastPly + 1 : 0,
    bookLastPly,
    bookExitPly: exitMove ? exitMove.ply : null,
    bookExitMove: exitMove ? formatMove(exitMove) : null,
  };
}

function chessComOpeningSlug(headers: GameHeaders): string | null {
  const ecoUrl = cleanHeader(headers.ECOUrl);
  if (!ecoUrl) return null;

  try {
    const url = new URL(ecoUrl);
    const marker = "/openings/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function sanTokensFromOpeningSlug(slug: string): string[] {
  const moveStart = slug.search(/\d+\./);
  if (moveStart < 0) return [];

  return slug
    .slice(moveStart)
    .split("-")
    .map((token) =>
      normalizeSan(token.replace(/^\d+\.(?:\.\.)?/, "")).trim(),
    )
    .filter(Boolean);
}

function openingNameFromSlug(slug: string): string | null {
  const moveStart = slug.search(/\d+\./);
  const namePart = (moveStart >= 0 ? slug.slice(0, moveStart) : slug).replace(
    /[.-]+$/,
    "",
  );
  const name = normalizeOpeningName(namePart);
  return name || null;
}

function findSanSequenceEndPly(
  moves: GameMove[],
  sequence: string[],
): number | null {
  if (!sequence.length || sequence.length > moves.length) return null;

  for (let start = 0; start <= moves.length - sequence.length; start += 1) {
    const matches = sequence.every(
      (san, offset) => normalizeSan(moves[start + offset].san) === san,
    );
    if (matches) return start + sequence.length - 1;
  }

  return null;
}

function deriveHeaderOpening(
  moves: GameMove[],
  headers: GameHeaders,
): OpeningBreakdown | null {
  const eco = cleanHeader(headers.ECO);
  const headerName = cleanHeader(headers.Opening);
  const slug = chessComOpeningSlug(headers);
  const slugName = slug ? openingNameFromSlug(slug) : null;
  const sequence = slug ? sanTokensFromOpeningSlug(slug) : [];
  const sequenceEndPly = findSanSequenceEndPly(moves, sequence);
  const name = headerName ?? slugName;

  if (name && sequenceEndPly !== null) {
    return breakdownForBookEnd(moves, name, eco, sequenceEndPly);
  }

  if (name || eco) {
    const firstMove = moves[0] ?? null;
    return {
      eco,
      name: name ?? "Unclassified Opening",
      matchedPlyCount: 0,
      bookLastPly: null,
      bookExitPly: firstMove ? firstMove.ply : null,
      bookExitMove: firstMove ? formatMove(firstMove) : null,
    };
  }

  return null;
}

export function deriveOpeningBreakdown(source: OpeningSource): OpeningBreakdown {
  const moves = sourceMoves(source);
  const headers = sourceHeaders(source);
  const headerBreakdown = deriveHeaderOpening(moves, headers);
  if (headerBreakdown) return headerBreakdown;

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
