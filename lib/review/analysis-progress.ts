export function progressPercent(current: number, total: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

export function estimateRemainingSeconds({
  current,
  total,
  startedAtMs,
  nowMs,
}: {
  current: number;
  total: number;
  startedAtMs: number | null;
  nowMs: number;
}): number | null {
  if (!startedAtMs || current <= 0 || total <= 0) return null;
  if (current >= total) return 0;

  const elapsedSeconds = Math.max(0, (nowMs - startedAtMs) / 1000);
  if (elapsedSeconds <= 0) return null;

  const secondsPerPosition = elapsedSeconds / current;
  return Math.max(0, Math.round(secondsPerPosition * (total - current)));
}

export function formatAnalysisEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "Estimating";
  if (seconds <= 0) return "Finishing";

  const rounded = Math.max(1, Math.round(seconds));
  if (rounded < 60) return `${rounded}s`;

  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
