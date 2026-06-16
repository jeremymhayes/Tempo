export type ServerAnalysisFailurePayload = {
  error: "Server analysis failed";
  reason: string;
};

export function serverAnalysisFailurePayload(
  error: unknown,
): ServerAnalysisFailurePayload {
  return {
    error: "Server analysis failed",
    reason:
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Unknown server analysis error.",
  };
}
