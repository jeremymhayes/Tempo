// Core chess domain types. Kept framework-agnostic so they can be shared
// between the frontend and a future backend / Stockfish service.

export type PieceColor = "w" | "b";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

/**
 * A single half-move (ply) within a parsed game.
 *
 * `fenBefore` / `fenAfter` are the full FEN positions on either side of the
 * move, which lets the board jump to any position without replaying the game.
 */
export interface GameMove {
  /** 0-based half-move index within the game. */
  ply: number;
  /** Full-move number as shown in notation (1, 1, 2, 2, ...). */
  moveNumber: number;
  /** Side that made the move. */
  color: PieceColor;
  /** Standard Algebraic Notation, e.g. "Nf3", "O-O", "exd5". */
  san: string;
  /** Long Algebraic Notation, e.g. "g1f3". */
  lan: string;
  from: string;
  to: string;
  /** Captured piece symbol, if any. */
  captured?: string;
  /** Promotion piece symbol, if any. */
  promotion?: string;
  /** Position before this move was played. */
  fenBefore: string;
  /** Position after this move was played. */
  fenAfter: string;
}

/**
 * The seven-tag-roster headers plus any extras found in the PGN.
 */
export interface GameHeaders {
  Event?: string;
  Site?: string;
  Date?: string;
  Round?: string;
  White?: string;
  Black?: string;
  Result?: string;
  [key: string]: string | undefined;
}

/**
 * The fully parsed game, ready to be navigated by the review UI.
 */
export interface ParsedGame {
  /** Raw PGN text the game was parsed from. */
  pgn: string;
  headers: GameHeaders;
  /** Starting position (defaults to the standard initial position). */
  initialFen: string;
  moves: GameMove[];
  white: string;
  black: string;
  result: GameResult;
  /** Date the game was played, as written in the PGN (may be partial). */
  datePlayed?: string;
}
