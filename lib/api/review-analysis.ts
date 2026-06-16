import type { ParsedGame } from "@/types/chess";
import type {
  ReviewAnalysisProgress,
  ReviewAnalysisResult,
} from "@/lib/review/engine-analysis";
import {
  isServerAnalysisStreamContentType,
  parseServerAnalysisFrame,
  SERVER_ANALYSIS_STREAM_CONTENT_TYPE,
} from "@/lib/review/server-analysis-stream";

type ServerAnalysisProgressHandler = (
  progress: ReviewAnalysisProgress,
) => void;

type InFlightServerAnalysis = {
  promise: Promise<ReviewAnalysisResult>;
  listeners: Set<ServerAnalysisProgressHandler>;
};

export type AnalyzeGameOnServerOptions = {
  onProgress?: ServerAnalysisProgressHandler;
};

const inFlightServerAnalyses = new Map<string, InFlightServerAnalysis>();

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
  options: AnalyzeGameOnServerOptions = {},
): Promise<ReviewAnalysisResult> {
  const key = game.pgn;
  const existing = inFlightServerAnalyses.get(key);
  if (existing) {
    if (options.onProgress) existing.listeners.add(options.onProgress);
    return existing.promise;
  }

  const listeners = new Set<ServerAnalysisProgressHandler>();
  if (options.onProgress) listeners.add(options.onProgress);

  const request = requestServerAnalysis(game, (progress) => {
    for (const listener of listeners) listener(progress);
  }).finally(() => {
    if (inFlightServerAnalyses.get(key)?.promise === request) {
      inFlightServerAnalyses.delete(key);
    }
  });

  const entry = { promise: request, listeners };
  inFlightServerAnalyses.set(key, entry);

  return request;
}

async function requestServerAnalysis(
  game: ParsedGame,
  onProgress?: ServerAnalysisProgressHandler,
): Promise<ReviewAnalysisResult> {
  const response = await fetch("/api/review/analyze", {
    method: "POST",
    headers: {
      Accept: `${SERVER_ANALYSIS_STREAM_CONTENT_TYPE}, application/json`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pgn: game.pgn }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (
    isServerAnalysisStreamContentType(response.headers.get("Content-Type"))
  ) {
    return readServerAnalysisStream(response, onProgress);
  }

  return (await response.json()) as ReviewAnalysisResult;
}

async function readServerAnalysisStream(
  response: Response,
  onProgress?: ServerAnalysisProgressHandler,
): Promise<ReviewAnalysisResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Server analysis stream was empty.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: ReviewAnalysisResult | null = null;

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const frame = parseServerAnalysisFrame(trimmed);
    if (frame.type === "progress") {
      onProgress?.(frame.progress);
    } else if (frame.type === "complete") {
      result = frame.result;
    } else {
      throw new Error(
        typeof frame.reason === "string"
          ? `${frame.error}: ${frame.reason}`
          : frame.error,
      );
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) consumeLine(line);
  }

  buffer += decoder.decode();
  consumeLine(buffer);

  if (!result) {
    throw new Error("Server analysis stream ended before completion.");
  }

  return result;
}
