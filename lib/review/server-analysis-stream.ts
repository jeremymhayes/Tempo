import type {
  ReviewAnalysisProgress,
  ReviewAnalysisResult,
} from "@/lib/review/engine-analysis";

export const SERVER_ANALYSIS_STREAM_CONTENT_TYPE = "application/x-ndjson";

export type ServerAnalysisStreamFrame =
  | { type: "progress"; progress: ReviewAnalysisProgress }
  | { type: "complete"; result: ReviewAnalysisResult }
  | { type: "error"; error: string; reason?: string };

export function encodeServerAnalysisFrame(
  frame: ServerAnalysisStreamFrame,
): string {
  return `${JSON.stringify(frame)}\n`;
}

export function isServerAnalysisStreamContentType(
  contentType: string | null,
): boolean {
  return Boolean(
    contentType
      ?.toLowerCase()
      .split(";")
      .some((part) => part.trim() === SERVER_ANALYSIS_STREAM_CONTENT_TYPE),
  );
}

export function parseServerAnalysisFrame(
  line: string,
): ServerAnalysisStreamFrame {
  const frame = JSON.parse(line) as Partial<ServerAnalysisStreamFrame>;
  if (
    frame?.type !== "progress" &&
    frame?.type !== "complete" &&
    frame?.type !== "error"
  ) {
    throw new Error("Unknown server analysis stream frame.");
  }

  return frame as ServerAnalysisStreamFrame;
}
