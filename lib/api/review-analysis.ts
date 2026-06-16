import type { ParsedGame } from "@/types/chess";
import type { ReviewAnalysisResult } from "@/lib/review/engine-analysis";

const inFlightServerAnalyses = new Map<string, Promise<ReviewAnalysisResult>>();

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      reason?: unknown;
    };
    if (typeof body.error === "string") {
      return typeof body.reason === "string"
        ? `${body.error}: ${body.reason}`
        : body.error;
    }
    return response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function analyzeGameOnServer(
  game: ParsedGame,
): Promise<ReviewAnalysisResult> {
  const key = game.pgn;
  const existing = inFlightServerAnalyses.get(key);
  if (existing) return existing;

  const request = requestServerAnalysis(game).finally(() => {
    if (inFlightServerAnalyses.get(key) === request) {
      inFlightServerAnalyses.delete(key);
    }
  });
  inFlightServerAnalyses.set(key, request);

  return request;
}

async function requestServerAnalysis(
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
