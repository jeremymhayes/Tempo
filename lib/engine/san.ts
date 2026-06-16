import { Chess } from "chess.js";

/** Split a UCI move ("e7e8q") into squares + optional promotion. */
export function uciToSquares(uci: string): {
  from: string;
  to: string;
  promotion?: string;
} | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  return { from, to, promotion };
}

/** Convert a single UCI move to SAN in the context of `fen`. */
export function uciToSan(fen: string, uci: string): string | null {
  const squares = uciToSquares(uci);
  if (!squares) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: squares.from,
      to: squares.to,
      promotion: squares.promotion,
    });
    return move ? move.san : null;
  } catch {
    return null;
  }
}

/** Convert a UCI principal variation to a list of SAN moves (best-effort). */
export function uciLineToSan(fen: string, uciMoves: string[], max = 8): string[] {
  const out: string[] = [];
  try {
    const chess = new Chess(fen);
    for (const uci of uciMoves.slice(0, max)) {
      const squares = uciToSquares(uci);
      if (!squares) break;
      const move = chess.move({
        from: squares.from,
        to: squares.to,
        promotion: squares.promotion,
      });
      if (!move) break;
      out.push(move.san);
    }
  } catch {
    // Return whatever parsed cleanly.
  }
  return out;
}
