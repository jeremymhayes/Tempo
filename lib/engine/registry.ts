import type { EngineDescriptor, EngineId } from "./types";

/**
 * Registry of selectable engines.
 *
 * Torch is listed but marked unavailable on purpose: there is no in-browser
 * (WASM/JS) Torch build to load, so faking its output would be dishonest. When
 * a genuine browser Torch build exists, add a `TorchEngine` implementing
 * `AnalysisEngine`, wire it in `createEngine`, and flip `available` to true.
 */
export const ENGINES: EngineDescriptor[] = [
  {
    id: "stockfish",
    name: "Stockfish 18",
    description: "Lite · single-threaded WASM",
    available: true,
  },
  {
    id: "torch",
    name: "Torch",
    description: "Unavailable in browser",
    available: false,
    unavailableReason:
      "No in-browser (WASM/JS) Torch build exists yet. TODO: add a TorchEngine when one is available.",
  },
];

export function getEngineDescriptor(id: EngineId): EngineDescriptor | undefined {
  return ENGINES.find((engine) => engine.id === id);
}
