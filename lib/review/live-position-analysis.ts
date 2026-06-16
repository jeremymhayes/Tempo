export function shouldEnableLivePositionAnalysis({
  hasGame,
  reviewReady,
  hasPrecomputedReviewAnalysis,
}: {
  hasGame: boolean;
  reviewReady: boolean;
  hasPrecomputedReviewAnalysis: boolean;
}): boolean {
  return hasGame && reviewReady && !hasPrecomputedReviewAnalysis;
}
