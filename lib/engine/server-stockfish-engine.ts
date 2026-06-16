import { createRequire } from "node:module";
import type {
  AnalysisEngine,
  AnalysisUpdate,
  AnalyzeOptions,
  EngineLine,
} from "@/lib/engine/types";
import { parseBestMove, parseInfoLine } from "@/lib/engine/uci";

const require = createRequire(import.meta.url);
const HANDSHAKE_TIMEOUT_MS = 15_000;
const DEFAULT_SEARCH_TIMEOUT_MS = 30_000;

type NodeStockfishProcess = {
  listener?: (line: string) => void;
  sendCommand(command: string): void;
  terminate?: () => void;
};

type InitStockfish = (
  enginePath?: string,
) => Promise<NodeStockfishProcess>;

type PendingAnalyze = {
  fen: string;
  options: AnalyzeOptions;
  onUpdate: (update: AnalysisUpdate) => void;
};

export class ServerStockfishEngine implements AnalysisEngine {
  readonly id = "stockfish" as const;

  private engine: NodeStockfishProcess | null = null;
  private ready = false;
  private analyzing = false;
  private discardNext = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  private currentFen = "";
  private lines = new Map<number, EngineLine>();
  private onUpdate: ((update: AnalysisUpdate) => void) | null = null;
  private pending: PendingAnalyze | null = null;

  private waiters: Array<{ match: (line: string) => boolean; resolve: () => void }> =
    [];

  constructor(
    private readonly flavor = "lite-single",
    private readonly searchTimeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
  ) {}

  async init(): Promise<void> {
    if (this.engine) return;

    const initStockfish = require("stockfish") as InitStockfish;
    const engine = await initStockfish(this.flavor);
    this.engine = engine;
    engine.listener = this.process;

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
    if (!this.engine || !this.ready) {
      throw new Error("Engine is not ready.");
    }

    this.pending = { fen, options, onUpdate };
    if (this.analyzing) {
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
    this.clearSearchTimer();
    if (!this.engine) return;
    try {
      this.post("quit");
    } catch {
      // ignore cleanup races
    }
    try {
      this.engine.terminate?.();
    } catch {
      // ignore cleanup races
    }
    this.engine.listener = undefined;
    this.engine = null;
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

    this.post(`setoption name MultiPV value ${multiPV}`);
    this.post(`setoption name Skill Level value ${skill}`);
    this.post(`position fen ${fen}`);

    this.analyzing = true;
    this.startSearchTimer();
    if (options.movetime && options.movetime > 0) {
      this.post(`go movetime ${Math.round(options.movetime)}`);
    } else {
      this.post(`go depth ${clamp(options.depth ?? 16, 1, 40)}`);
    }
  }

  private post(command: string): void {
    this.engine?.sendCommand(command);
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

  private process = (line: string): void => {
    if (!line) return;

    for (let i = this.waiters.length - 1; i >= 0; i--) {
      if (this.waiters[i].match(line)) {
        this.waiters[i].resolve();
        this.waiters.splice(i, 1);
      }
    }

    if (!this.analyzing) return;

    const best = parseBestMove(line);
    if (best !== undefined) {
      this.clearSearchTimer();
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
  };

  private startSearchTimer(): void {
    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      if (!this.analyzing) return;
      try {
        this.post("stop");
      } catch {
        // ignore timeout cleanup
      }
      this.analyzing = false;
      this.emit(true, null);
    }, this.searchTimeoutMs);
  }

  private clearSearchTimer(): void {
    if (!this.searchTimer) return;
    clearTimeout(this.searchTimer);
    this.searchTimer = null;
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
