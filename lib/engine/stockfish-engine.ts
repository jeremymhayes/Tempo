import type {
  AnalysisEngine,
  AnalysisUpdate,
  AnalyzeOptions,
  EngineLine,
} from "./types";
import { parseBestMove, parseInfoLine } from "./uci";

/** Same-origin worker; the sibling `.wasm` is fetched relative to this URL. */
const ENGINE_URL = "/engines/stockfish-18-lite-single.js";

const HANDSHAKE_TIMEOUT_MS = 15_000;

type PendingAnalyze = {
  fen: string;
  options: AnalyzeOptions;
  onUpdate: (update: AnalysisUpdate) => void;
};

/**
 * Stockfish 18 (lite, single-threaded WASM) running inside a Web Worker, so the
 * search never blocks the UI thread. Searches are serialized: starting a new
 * analysis while one is running sends `stop`, waits for the engine to settle,
 * and discards the stale `bestmove` before launching the new search.
 */
export class StockfishEngine implements AnalysisEngine {
  readonly id = "stockfish" as const;

  private worker: Worker | null = null;
  private ready = false;
  private analyzing = false;
  private discardNext = false;

  private currentFen = "";
  private lines = new Map<number, EngineLine>();
  private onUpdate: ((update: AnalysisUpdate) => void) | null = null;
  private pending: PendingAnalyze | null = null;

  private waiters: Array<{ match: (line: string) => boolean; resolve: () => void }> =
    [];

  async init(): Promise<void> {
    if (this.worker) return;
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      throw new Error("Web Workers are not available in this environment.");
    }

    let worker: Worker;
    try {
      worker = new Worker(ENGINE_URL);
    } catch (cause) {
      throw new Error("Failed to load the Stockfish engine worker.", { cause });
    }
    this.worker = worker;

    worker.addEventListener("message", this.handleMessage);
    worker.addEventListener("error", this.handleError);

    this.post("uci");
    await this.waitFor((line) => line.includes("uciok"), "uci handshake");
    this.post("isready");
    await this.waitFor((line) => line.includes("readyok"), "engine ready");
    this.ready = true;
  }

  analyze(
    fen: string,
    options: AnalyzeOptions,
    onUpdate: (update: AnalysisUpdate) => void,
  ): void {
    if (!this.worker || !this.ready) {
      throw new Error("Engine is not ready.");
    }

    this.pending = { fen, options, onUpdate };
    if (this.analyzing) {
      // Replace the in-flight search; its bestmove will be discarded.
      this.discardNext = true;
      this.post("stop");
      return;
    }
    this.runPending();
  }

  stop(): void {
    this.pending = null;
    if (this.analyzing) this.post("stop");
  }

  dispose(): void {
    if (!this.worker) return;
    try {
      this.post("quit");
    } catch {
      // ignore — terminating anyway
    }
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.removeEventListener("error", this.handleError);
    this.worker.terminate();
    this.worker = null;
    this.ready = false;
    this.analyzing = false;
    this.onUpdate = null;
    this.pending = null;
    this.waiters = [];
  }

  private runPending(): void {
    if (!this.pending) return;
    const { fen, options, onUpdate } = this.pending;
    this.pending = null;

    this.onUpdate = onUpdate;
    this.currentFen = fen;
    this.lines.clear();

    const multiPV = clamp(options.multiPV ?? 1, 1, 5);
    const skill = clamp(options.skill ?? 20, 0, 20);
    const uciElo = clamp(options.uciElo ?? 1320, 1320, 3190);

    this.post(`setoption name MultiPV value ${multiPV}`);
    this.post(`setoption name Skill Level value ${skill}`);
    this.post(
      `setoption name UCI_LimitStrength value ${
        options.limitStrength ? "true" : "false"
      }`,
    );
    if (options.limitStrength) {
      this.post(`setoption name UCI_Elo value ${uciElo}`);
    }
    this.post(`position fen ${fen}`);

    this.analyzing = true;
    if (options.nodes && options.nodes > 0) {
      this.post(`go nodes ${Math.round(options.nodes)}`);
    } else if (options.movetime && options.movetime > 0) {
      this.post(`go movetime ${Math.round(options.movetime)}`);
    } else {
      this.post(`go depth ${clamp(options.depth ?? 16, 1, 40)}`);
    }
  }

  private post(command: string): void {
    this.worker?.postMessage(command);
  }

  private waitFor(
    match: (line: string) => boolean,
    label: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.resolve !== wrapped);
        reject(new Error(`Engine timed out during ${label}.`));
      }, HANDSHAKE_TIMEOUT_MS);
      const wrapped = () => {
        clearTimeout(timer);
        resolve();
      };
      this.waiters.push({ match, resolve: wrapped });
    });
  }

  private handleMessage = (event: MessageEvent): void => {
    const line: string =
      typeof event.data === "string" ? event.data : (event.data?.data ?? "");
    if (!line) return;
    this.process(line);
  };

  private handleError = (event: ErrorEvent): void => {
    this.onUpdate?.({
      fen: this.currentFen,
      lines: [],
      bestMove: null,
      depth: 0,
      done: true,
    });
    // Surface via console; the hook also has its own error path on init.
    console.error("Stockfish worker error:", event.message);
  };

  private process(line: string): void {
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      if (this.waiters[i].match(line)) {
        this.waiters[i].resolve();
        this.waiters.splice(i, 1);
      }
    }

    if (!this.analyzing) return;

    const best = parseBestMove(line);
    if (best !== undefined) {
      this.analyzing = false;
      if (this.discardNext) {
        this.discardNext = false;
        this.runPending();
        return;
      }
      this.emit(true, best);
      if (this.pending) this.runPending();
      return;
    }

    const info = parseInfoLine(line);
    if (info?.score && info.pv) {
      const multipv = info.multipv ?? 1;
      this.lines.set(multipv, {
        multipv,
        depth: info.depth ?? 0,
        score: info.score,
        pv: info.pv,
      });
      this.emit(false);
    }
  }

  private emit(done: boolean, bestMove?: string | null): void {
    if (!this.onUpdate) return;
    const lines = [...this.lines.values()].sort((a, b) => a.multipv - b.multipv);
    this.onUpdate({
      fen: this.currentFen,
      lines,
      bestMove: bestMove ?? lines[0]?.pv[0] ?? null,
      depth: lines[0]?.depth ?? 0,
      done,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
