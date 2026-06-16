import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
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
const STOCKFISH_FLAVOR_FILES: Record<string, string> = {
  full: "stockfish-18.js",
  lite: "stockfish-18-lite.js",
  single: "stockfish-18-single.js",
  "lite-single": "stockfish-18-lite-single.js",
  "single-lite": "stockfish-18-lite-single.js",
  asm: "stockfish-18-asm.js",
};

type PendingAnalyze = {
  fen: string;
  options: AnalyzeOptions;
  onUpdate: (update: AnalysisUpdate) => void;
};

export function getStockfishScriptPath(flavor = "lite-single"): string {
  const normalized = flavor.trim().toLowerCase();
  const filename = STOCKFISH_FLAVOR_FILES[normalized] ?? flavor;
  if (filename.includes("/") || filename.includes("\\")) {
    return filename;
  }

  const nodeModulesPath = join(
    process.cwd(),
    "node_modules",
    "stockfish",
    "bin",
    filename,
  );
  const scriptPath = existsSync(nodeModulesPath)
    ? nodeModulesPath
    : join(dirname(resolveStockfishPackageJson()), "bin", filename);
  if (!existsSync(scriptPath)) {
    throw new Error(`Stockfish engine script was not found: ${scriptPath}`);
  }
  return scriptPath;
}

function resolveStockfishPackageJson(): string {
  const resolved = require.resolve("stockfish/package.json");
  if (typeof resolved !== "string") {
    throw new Error("Could not resolve the installed stockfish package path.");
  }
  return resolved;
}

export class ServerStockfishEngine implements AnalysisEngine {
  readonly id = "stockfish" as const;

  private engine: ChildProcessWithoutNullStreams | null = null;
  private ready = false;
  private analyzing = false;
  private discardNext = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private stdoutBuffer = "";
  private stderrBuffer = "";

  private currentFen = "";
  private lines = new Map<number, EngineLine>();
  private onUpdate: ((update: AnalysisUpdate) => void) | null = null;
  private pending: PendingAnalyze | null = null;

  private waiters: Array<{
    match: (line: string) => boolean;
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    private readonly flavor = "lite-single",
    private readonly searchTimeoutMs = DEFAULT_SEARCH_TIMEOUT_MS,
  ) {}

  async init(): Promise<void> {
    if (this.engine) return;

    const scriptPath = getStockfishScriptPath(this.flavor);
    const engine = spawn(process.execPath, [scriptPath], {
      stdio: "pipe",
      windowsHide: true,
    });
    this.engine = engine;

    engine.stdout.setEncoding("utf8");
    engine.stderr.setEncoding("utf8");
    engine.stdout.on("data", this.handleStdout);
    engine.stderr.on("data", this.handleStderr);
    engine.once("error", this.handleProcessError);
    engine.once("exit", this.handleProcessExit);

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
      if (!this.engine.killed) this.engine.kill();
    } catch {
      // ignore cleanup races
    }
    this.engine.stdout.off("data", this.handleStdout);
    this.engine.stderr.off("data", this.handleStderr);
    this.engine.off("error", this.handleProcessError);
    this.engine.off("exit", this.handleProcessExit);
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
    if (!this.engine || this.engine.stdin.destroyed) return;
    this.engine.stdin.write(`${command}\n`);
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
      this.waiters.push({ match, resolve: wrapped, reject });
    });
  }

  private handleStdout = (chunk: string): void => {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      this.processLine(line.trim());
    }
  };

  private handleStderr = (chunk: string): void => {
    this.stderrBuffer += chunk;
  };

  private handleProcessError = (error: Error): void => {
    this.rejectWaiters(error);
    if (this.analyzing) {
      this.analyzing = false;
      this.emit(true, null);
    }
  };

  private handleProcessExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    const details = this.stderrBuffer.trim();
    const error = new Error(
      [
        `Stockfish exited unexpectedly with code ${code ?? "null"}`,
        signal ? `signal ${signal}` : "",
        details ? `stderr: ${details.slice(0, 500)}` : "",
      ]
        .filter(Boolean)
        .join("; "),
    );
    this.rejectWaiters(error);
    if (this.analyzing) {
      this.analyzing = false;
      this.emit(true, null);
    }
  };

  private rejectWaiters(error: Error): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      waiter.reject(error);
    }
  }

  private processLine(line: string): void {
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
  }

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
