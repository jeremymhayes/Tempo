export type AnalysisPgnBodyResult =
  | { ok: true; pgn: string }
  | { ok: false; status: number; error: string };

export function readAnalysisPgnBody(
  body: unknown,
  maxPgnLength: number,
): AnalysisPgnBodyResult {
  const pgn =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { pgn?: unknown }).pgn
      : undefined;

  if (!pgn || typeof pgn !== "string") {
    return { ok: false, status: 400, error: "PGN is required" };
  }

  const trimmed = pgn.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "PGN is required" };
  }

  if (trimmed.length > maxPgnLength) {
    return {
      ok: false,
      status: 413,
      error: "PGN is too large for server analysis",
    };
  }

  return { ok: true, pgn: trimmed };
}
