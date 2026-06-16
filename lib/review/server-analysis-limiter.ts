export type ServerAnalysisSlot = {
  release: () => void;
};

let activeAnalyses = 0;

export function tryAcquireServerAnalysisSlot(
  maxConcurrent: number,
): ServerAnalysisSlot | null {
  const limit = Math.max(1, Math.floor(maxConcurrent));
  if (activeAnalyses >= limit) return null;

  activeAnalyses += 1;
  let released = false;

  return {
    release() {
      if (released) return;
      released = true;
      activeAnalyses = Math.max(0, activeAnalyses - 1);
    },
  };
}
