import type { AnalysisEngine, EngineId } from "./types";
import { StockfishEngine } from "./stockfish-engine";
import { getEngineDescriptor } from "./registry";

/**
 * Create an engine instance by id. Throws for unavailable engines so callers
 * surface a clear error instead of silently producing no analysis.
 */
export function createEngine(id: EngineId): AnalysisEngine {
  const descriptor = getEngineDescriptor(id);
  if (!descriptor?.available) {
    throw new Error(
      descriptor?.unavailableReason ?? `Engine "${id}" is not available.`,
    );
  }

  switch (id) {
    case "stockfish":
      return new StockfishEngine();
    // TODO: case "torch": return new TorchEngine();
    //       Blocked on a genuine in-browser Torch build (see registry.ts).
    default:
      throw new Error(`Engine "${id}" is not available.`);
  }
}

export * from "./types";
export { ENGINES, getEngineDescriptor } from "./registry";
