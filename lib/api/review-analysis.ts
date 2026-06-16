import type { ParsedGame } from "@/types/chess";
import type { ReviewAnalysisResult } from "@/lib/review/engine-analysis";

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function analyzeGameOnServer(
  game: ParsedGame,
): Promise<ReviewAnalysisResult> {
  const response = await fetch("/api/review/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pgn: game.pgn }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as ReviewAnalysisResult;
}
