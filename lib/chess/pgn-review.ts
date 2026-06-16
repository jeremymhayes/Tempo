import { parsePgn } from "@/lib/chess/parse-pgn";
import type { ParsedGame } from "@/types/chess";

export type ParsePgnForReviewResult =
  | { ok: true; game: ParsedGame }
  | { ok: false; error: string };

const MAX_PGN_LENGTH = 200_000;

export function parsePgnForReview(pgn: string): ParsePgnForReviewResult {
  if (pgn.trim().length > MAX_PGN_LENGTH) {
    return { ok: false, error: "PGN is too large to review." };
  }

  return parsePgn(pgn);
}
