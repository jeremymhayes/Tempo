"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Home,
  ListChecks,
  LogIn,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  UserRound,
} from "lucide-react";
import type { ParsedGame, PieceColor, GameMove } from "@/types/chess";
import type { MoveClassification, ReviewedMove } from "@/types/review";
import { createStarterReview } from "@/lib/review/starter-review";
import { loadCurrentGame } from "@/lib/storage";
import {
  START_PLY,
  fenAtPly,
  isAtEnd,
  isAtStart,
  lastMoveSquares,
  nextPly,
  prevPly,
} from "@/lib/chess/game-navigation";
import { useEngineAnalysis } from "@/lib/engine/use-engine";
import {
  DEFAULT_SETTINGS,
  SETTINGS_BOUNDS,
  loadSettings,
  saveSettings,
  type AnalysisSettings,
} from "@/lib/engine/settings";
import type { AnalysisUpdate, EngineStatus } from "@/lib/engine/types";
import {
  fenSideToMove,
  formatScore,
  toWhitePov,
  type WhiteScore,
} from "@/lib/engine/eval-format";
import { uciLineToSan, uciToSan, uciToSquares } from "@/lib/engine/san";
import { centipawnLoss, classifyLoss } from "@/lib/engine/classify";
import { CLASS_META, CLASS_ORDER } from "@/lib/review/classification-meta";
import { AnalysisBoard } from "@/components/chess/analysis-board";
import { EvaluationBar } from "./evaluation-bar";
import { cn } from "@/lib/utils";

type ListMove = GameMove & { classification?: MoveClassification };

interface MovePair {
  moveNumber: number;
  white?: ListMove;
  black?: ListMove;
}

const RESULT_LABEL: Record<string, string> = {
  "1-0": "White won",
  "0-1": "Black won",
  "1/2-1/2": "Draw",
  "*": "Game in progress",
};

const CLASSIFICATION_SCORE: Record<MoveClassification, number> = {
  brilliant: 98,
  great: 92,
  best: 88,
  good: 82,
  book: 90,
  inaccuracy: 68,
  miss: 35,
  mistake: 45,
  blunder: 18,
};

function useBoxSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, size] as const;
}

function toPairs(moves: ListMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (const move of moves) {
    const last = pairs[pairs.length - 1];
    if (move.color === "w" || !last || last.black) {
      pairs.push({ moveNumber: move.moveNumber });
    }
    const target = pairs[pairs.length - 1];
    if (move.color === "w") target.white = move;
    else target.black = move;
  }
  return pairs;
}

function average(values: number[]) {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildReviewStats(moves: ListMove[]) {
  const scores = { white: [] as number[], black: [] as number[] };
  const counts = {
    white: {} as Partial<Record<MoveClassification, number>>,
    black: {} as Partial<Record<MoveClassification, number>>,
  };

  for (const move of moves) {
    if (!move.classification) continue;
    const side = move.color === "w" ? "white" : "black";
    counts[side][move.classification] =
      (counts[side][move.classification] ?? 0) + 1;
    scores[side].push(CLASSIFICATION_SCORE[move.classification]);
  }

  return {
    counts,
    accuracy: {
      white: average(scores.white),
      black: average(scores.black),
    },
  };
}

function formatAccuracy(value?: number) {
  return typeof value === "number" ? value.toFixed(1) : "--";
}

function formatPlayer(name: string | undefined, fallback: string) {
  const value = name?.trim();
  return value && value !== "?" ? value : fallback;
}

function shortName(value: string) {
  const clean = value.trim();
  if (clean.length <= 14) return clean;
  return `${clean.slice(0, 13)}…`;
}

export function ReviewClient({
  initialGame,
}: {
  initialGame?: ParsedGame | null;
}) {
  const hasInitialGame = initialGame !== undefined;
  const [game, setGame] = useState<ParsedGame | null>(initialGame ?? null);
  const [loaded, setLoaded] = useState(hasInitialGame);
  const [ply, setPly] = useState(START_PLY);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [evalByPly, setEvalByPly] = useState<Record<number, WhiteScore>>({});
  const [boardAreaRef, boardArea] = useBoxSize<HTMLDivElement>();

  const updateSettings = useCallback((patch: Partial<AnalysisSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const review = useMemo(() => (game ? createStarterReview(game) : null), [game]);
  const reviewedMoves = review?.moves ?? [];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (hasInitialGame) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(loadCurrentGame());
    setLoaded(true);
  }, [hasInitialGame]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvalByPly({});
  }, [game]);

  const fen = game ? fenAtPly(game, ply) : "";
  const engine = useEngineAnalysis({ fen, enabled: Boolean(game), settings });
  const liveUpdate =
    engine.update && engine.update.fen === fen ? engine.update : null;

  useEffect(() => {
    if (!liveUpdate?.done || !liveUpdate.lines[0]) return;
    const ws = toWhitePov(liveUpdate.lines[0].score, fenSideToMove(fen));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvalByPly((prev) =>
      prev[ply] && prev[ply].type === ws.type && prev[ply].value === ws.value
        ? prev
        : { ...prev, [ply]: ws },
    );
  }, [liveUpdate, fen, ply]);

  const goStart = useCallback(() => setPly(START_PLY), []);
  const goEnd = useCallback(() => {
    if (game) setPly(game.moves.length - 1);
  }, [game]);
  const goPrev = useCallback(() => {
    if (game) setPly((p) => prevPly(game, p));
  }, [game]);
  const goNext = useCallback(() => {
    if (game) setPly((p) => nextPly(game, p));
  }, [game]);

  useEffect(() => {
    if (!game) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowUp") goStart();
      else if (e.key === "ArrowDown") goEnd();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, goPrev, goNext, goStart, goEnd]);

  if (!loaded) {
    return (
      <ReviewShell>
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      </ReviewShell>
    );
  }

  if (!game) {
    return (
      <ReviewShell>
        <div className="flex h-full items-center justify-center">
          <div className="border border-zinc-800 bg-zinc-950 p-8 text-center">
            <p className="text-lg font-bold text-zinc-100">No game loaded</p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Import a PGN to start a guest review or sign in to open a saved game.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-10 items-center bg-zinc-100 px-5 text-sm font-bold text-zinc-950 hover:bg-white"
            >
              Go to import
            </Link>
          </div>
        </div>
      </ReviewShell>
    );
  }

  const orientation: PieceColor = "w";
  const sideToMove = fenSideToMove(fen);
  const lastMove = lastMoveSquares(game, ply);
  const liveWhiteScore: WhiteScore | null = liveUpdate?.lines[0]
    ? toWhitePov(liveUpdate.lines[0].score, sideToMove)
    : (evalByPly[ply] ?? null);

  const bestArrow = (() => {
    if (!settings.showBestMove) return null;
    const uci = liveUpdate?.bestMove ?? liveUpdate?.lines[0]?.pv[0];
    if (!uci) return null;
    const sq = uciToSquares(uci);
    return sq ? { from: sq.from, to: sq.to } : null;
  })();

  const classifiedMoves = game.moves.map((move, i) => {
    const base = reviewedMoves[i] ?? move;
    const before = evalByPly[i - 1];
    const after = evalByPly[i];
    if (before && after) {
      const loss = centipawnLoss(before, after, move.color);
      return { ...base, classification: classifyLoss(loss), centipawnLoss: loss };
    }
    return base;
  });

  const currentMove = ply >= 0 ? (classifiedMoves[ply] as ReviewedMove) : null;
  const currentClass = currentMove?.classification ?? null;
  const boardSide = Math.max(0, Math.min(boardArea.w - 46, boardArea.h - 94));
  const whiteName = formatPlayer(game.white, "White");
  const blackName = formatPlayer(game.black, "Black");
  const stats = buildReviewStats(classifiedMoves);

  return (
    <ReviewShell>
      <div className="grid h-full min-h-0 grid-cols-1 overflow-y-auto bg-[#111111] text-zinc-100 xl:grid-cols-[minmax(620px,1fr)_500px] xl:overflow-hidden">
        <section className="relative flex min-h-[680px] flex-col border-r border-zinc-800 bg-[#151515] xl:min-h-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-5">
            <div>
              <p className="text-[11px] font-bold uppercase text-zinc-500">
                Tempo Analysis
              </p>
              <p className="text-sm font-bold text-zinc-100">
                {shortName(whiteName)} vs {shortName(blackName)}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="Engine settings"
                onClick={() => setSettingsOpen((open) => !open)}
                className="flex size-10 items-center justify-center border border-zinc-700 bg-[#202020] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white"
              >
                <Settings className="size-5" />
              </button>
              {settingsOpen ? (
                <EngineSettingsPanel
                  settings={settings}
                  status={engine.status}
                  depth={liveUpdate?.depth ?? 0}
                  onChange={updateSettings}
                  onAnalyzeNow={engine.analyzeNow}
                />
              ) : null}
            </div>
          </div>

          <div
            ref={boardAreaRef}
            className="flex min-h-0 flex-1 items-center justify-center px-4 py-3"
          >
            {boardSide > 0 ? (
              <div style={{ width: settings.showEvalBar ? boardSide + 38 : boardSide }}>
                <PlayerStrip
                  name={blackName}
                  side="black"
                  style={{
                    marginLeft: settings.showEvalBar ? 38 : 0,
                    width: boardSide,
                  }}
                />
                <div className="flex items-stretch gap-2.5">
                  {settings.showEvalBar ? (
                    <EvaluationBar
                      score={liveWhiteScore}
                      orientation={orientation}
                      className="h-auto"
                    />
                  ) : null}
                  <div style={{ width: boardSide, height: boardSide }}>
                    <AnalysisBoard
                      fen={fen}
                      orientation={orientation}
                      lastMove={lastMove}
                      bestMove={bestArrow}
                      classification={currentClass}
                    />
                  </div>
                </div>
                <PlayerStrip
                  name={whiteName}
                  side="white"
                  style={{
                    marginLeft: settings.showEvalBar ? 38 : 0,
                    width: boardSide,
                  }}
                />
              </div>
            ) : null}
          </div>

          <BoardFooter
            result={RESULT_LABEL[game.result] ?? game.result}
            currentMove={currentMove}
            atStart={isAtStart(ply)}
            atEnd={isAtEnd(game, ply)}
            onStart={goStart}
            onPrev={goPrev}
            onNext={goNext}
            onEnd={goEnd}
          />
        </section>

        <ReviewPanel
          game={game}
          whiteName={whiteName}
          blackName={blackName}
          moves={classifiedMoves}
          currentPly={ply}
          onSelect={setPly}
          stats={stats}
          update={liveUpdate}
          fen={fen}
          showBestMove={settings.showBestMove}
          evalByPly={evalByPly}
          onAnalyzeNow={engine.analyzeNow}
        />
      </div>
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-black text-zinc-100">
      <NavigationRail />
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

function NavigationRail() {
  const links = [
    { href: "/", label: "Import", icon: Home },
    { href: "/review", label: "Review", icon: ListChecks },
    { href: "/games", label: "Saved games", icon: Crown },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/sign-in", label: "Sign in", icon: LogIn },
  ];

  return (
    <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-zinc-800 bg-[#0b0b0b] py-3 sm:flex">
      <Link
        href="/"
        aria-label="Tempo"
        className="mb-7 flex size-9 items-center justify-center bg-[#79b84a] text-lg font-black text-zinc-950"
      >
        T
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className="flex size-9 items-center justify-center text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
          >
            <Icon className="size-5" />
          </Link>
        ))}
      </nav>
      <UserRound className="size-5 text-zinc-600" />
    </aside>
  );
}

function PlayerStrip({
  name,
  side,
  style,
}: {
  name: string;
  side: "white" | "black";
  style?: CSSProperties;
}) {
  return (
    <div
      className="flex h-9 items-center gap-2 text-sm font-bold text-zinc-200"
      style={style}
    >
      <div
        className={cn(
          "flex size-8 items-center justify-center border border-zinc-700 text-xs font-black",
          side === "white" ? "bg-zinc-200 text-zinc-950" : "bg-zinc-800 text-zinc-200",
        )}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
      <span className="truncate">{name}</span>
    </div>
  );
}

function BoardFooter({
  result,
  currentMove,
  atStart,
  atEnd,
  onStart,
  onPrev,
  onNext,
  onEnd,
}: {
  result: string;
  currentMove: ReviewedMove | null;
  atStart: boolean;
  atEnd: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  const meta = currentMove?.classification
    ? CLASS_META[currentMove.classification]
    : null;

  return (
    <footer className="flex h-14 shrink-0 items-center justify-between border-t border-zinc-800 bg-[#101010] px-5">
      <div className="min-w-0">
        <p className="text-xs font-bold text-zinc-400">{result}</p>
        <p className="truncate font-mono text-sm text-zinc-100">
          {currentMove
            ? `${currentMove.moveNumber}${currentMove.color === "w" ? "." : "..."} ${currentMove.san}`
            : "Starting position"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {meta ? (
          <span className={cn("text-sm font-black", meta.text)}>
            <span
              className={cn(
                "mr-2 inline-flex size-6 items-center justify-center text-[11px]",
                meta.badge,
                meta.text,
              )}
            >
              {meta.symbol}
            </span>
            {meta.label}
          </span>
        ) : null}
        <div className="flex items-center">
          <NavButton onClick={onStart} disabled={atStart} label="Start">
            <ChevronsLeft className="size-4" />
          </NavButton>
          <NavButton onClick={onPrev} disabled={atStart} label="Previous">
            <ChevronLeft className="size-4" />
          </NavButton>
          <NavButton onClick={onNext} disabled={atEnd} label="Next">
            <ChevronRight className="size-4" />
          </NavButton>
          <NavButton onClick={onEnd} disabled={atEnd} label="End">
            <ChevronsRight className="size-4" />
          </NavButton>
        </div>
      </div>
    </footer>
  );
}

function NavButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center border-y border-r border-zinc-700 bg-[#202020] text-zinc-300 first:border-l hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:text-zinc-700"
    >
      {children}
    </button>
  );
}

function EngineSettingsPanel({
  settings,
  status,
  depth,
  onChange,
  onAnalyzeNow,
}: {
  settings: AnalysisSettings;
  status: EngineStatus;
  depth: number;
  onChange: (patch: Partial<AnalysisSettings>) => void;
  onAnalyzeNow: () => void;
}) {
  const b = SETTINGS_BOUNDS;

  return (
    <div className="absolute right-0 top-12 z-50 w-[360px] border border-zinc-700 bg-[#171717] shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm font-black text-zinc-100">Engine</p>
          <p className="text-xs text-zinc-500">
            {status} {depth ? `depth ${depth}` : ""}
          </p>
        </div>
        <SlidersHorizontal className="size-4 text-zinc-500" />
      </div>
      <div className="divide-y divide-zinc-800">
        <SettingsRow label="Limit by">
          <select
            value={settings.mode}
            onChange={(e) =>
              onChange({ mode: e.target.value as AnalysisSettings["mode"] })
            }
            className="h-8 w-36 border border-zinc-700 bg-zinc-950 px-2 text-xs font-bold text-zinc-100"
          >
            <option value="depth">Depth</option>
            <option value="time">Time</option>
          </select>
        </SettingsRow>
        {settings.mode === "depth" ? (
          <SettingsRow label={`Depth ${settings.depth}`}>
            <input
              type="range"
              min={b.depth.min}
              max={b.depth.max}
              value={settings.depth}
              onChange={(e) => onChange({ depth: Number(e.target.value) })}
              className="w-36 accent-[#79b84a]"
            />
          </SettingsRow>
        ) : (
          <SettingsRow label={`Time ${(settings.movetime / 1000).toFixed(1)}s`}>
            <input
              type="range"
              min={b.movetime.min}
              max={b.movetime.max}
              step={b.movetime.step}
              value={settings.movetime}
              onChange={(e) => onChange({ movetime: Number(e.target.value) })}
              className="w-36 accent-[#79b84a]"
            />
          </SettingsRow>
        )}
        <SettingsRow label="Lines">
          <select
            value={String(settings.multiPV)}
            onChange={(e) => onChange({ multiPV: Number(e.target.value) })}
            className="h-8 w-36 border border-zinc-700 bg-zinc-950 px-2 text-xs font-bold text-zinc-100"
          >
            {Array.from(
              { length: b.multiPV.max - b.multiPV.min + 1 },
              (_, i) => b.multiPV.min + i,
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow label={`Skill ${settings.skill}`}>
          <input
            type="range"
            min={b.skill.min}
            max={b.skill.max}
            value={settings.skill}
            onChange={(e) => onChange({ skill: Number(e.target.value) })}
            className="w-36 accent-[#79b84a]"
          />
        </SettingsRow>
        <SettingsToggle
          label="Auto-analyze"
          checked={settings.autoAnalyze}
          onChange={(value) => onChange({ autoAnalyze: value })}
        />
        <SettingsToggle
          label="Evaluation bar"
          checked={settings.showEvalBar}
          onChange={(value) => onChange({ showEvalBar: value })}
        />
        <SettingsToggle
          label="Best move"
          checked={settings.showBestMove}
          onChange={(value) => onChange({ showBestMove: value })}
        />
      </div>
      <button
        type="button"
        onClick={onAnalyzeNow}
        className="h-10 w-full bg-[#79b84a] text-sm font-black text-zinc-950 hover:bg-[#8dcc56]"
      >
        Analyze now
      </button>
    </div>
  );
}

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex h-12 items-center justify-between px-4 text-sm font-bold text-zinc-300">
      {label}
      {children}
    </label>
  );
}

function SettingsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-12 items-center justify-between px-4 text-sm font-bold text-zinc-300">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[#79b84a]"
      />
    </label>
  );
}

function ReviewPanel({
  game,
  whiteName,
  blackName,
  moves,
  currentPly,
  onSelect,
  stats,
  update,
  fen,
  showBestMove,
  evalByPly,
  onAnalyzeNow,
}: {
  game: ParsedGame;
  whiteName: string;
  blackName: string;
  moves: ListMove[];
  currentPly: number;
  onSelect: (ply: number) => void;
  stats: ReturnType<typeof buildReviewStats>;
  update: AnalysisUpdate | null;
  fen: string;
  showBestMove: boolean;
  evalByPly: Record<number, WhiteScore>;
  onAnalyzeNow: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col bg-[#1b1b1b]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center bg-[#79b84a] text-zinc-950">
            <Star className="size-4 fill-current" />
          </span>
          <h1 className="text-lg font-black text-zinc-100">Game Review</h1>
        </div>
        <Search className="size-5 text-zinc-500" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <CoachMessage currentMove={moves[currentPly]} />
        <EvalGraph moves={moves} evalByPly={evalByPly} />
        <PlayersSummary
          whiteName={whiteName}
          blackName={blackName}
          stats={stats}
        />
        <ClassificationTable stats={stats} />
        <PhaseTable stats={stats} />
        <BestLine
          fen={fen}
          update={update}
          showBestMove={showBestMove}
        />
        <MoveList moves={moves} currentPly={currentPly} onSelect={onSelect} />
      </div>

      <footer className="shrink-0 border-t border-zinc-800 p-6">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-zinc-500">
          <span>{game.headers.Event ?? "Imported game"}</span>
          <span>{game.datePlayed ?? game.result}</span>
        </div>
        <button
          type="button"
          onClick={onAnalyzeNow}
          className="h-14 w-full bg-[#79b84a] text-xl font-black text-zinc-950 hover:bg-[#8dcc56]"
        >
          Start Review
        </button>
      </footer>
    </aside>
  );
}

function CoachMessage({ currentMove }: { currentMove?: ListMove }) {
  const meta = currentMove?.classification
    ? CLASS_META[currentMove.classification]
    : null;
  const message = meta
    ? `${meta.label} move: ${currentMove?.san}. Keep stepping through the game to compare the engine line.`
    : "You had a nice tactical find in this game. Let’s review!";

  return (
    <div className="mb-5 flex items-end gap-3">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#3b3028]">
        <div className="absolute left-5 top-3 size-10 bg-[#f0bf8d]" />
        <div className="absolute left-3 top-10 h-10 w-14 bg-[#638092]" />
        <div className="absolute left-6 top-4 h-4 w-8 bg-[#5c3c24]" />
        <div className="absolute left-7 top-8 h-1 w-2 bg-zinc-900" />
        <div className="absolute left-11 top-8 h-1 w-2 bg-zinc-900" />
        <div className="absolute left-8 top-[52px] h-1 w-8 bg-[#7a3f2c]" />
      </div>
      <p className="relative flex-1 bg-zinc-200 px-4 py-3 text-sm leading-6 text-zinc-800">
        {message}
      </p>
    </div>
  );
}

function EvalGraph({
  moves,
  evalByPly,
}: {
  moves: ListMove[];
  evalByPly: Record<number, WhiteScore>;
}) {
  const width = 440;
  const height = 78;
  const points = moves.map((move, i) => {
    const score = evalByPly[i];
    const cp =
      score?.type === "cp"
        ? score.value
        : score?.type === "mate"
          ? Math.sign(score.value) * 900
          : (CLASSIFICATION_SCORE[move.classification ?? "good"] - 75) * 22;
    const x = moves.length <= 1 ? 0 : (i / (moves.length - 1)) * width;
    const y = height / 2 - Math.max(-650, Math.min(650, cp)) / 18;
    return { x, y: Math.max(4, Math.min(height - 4, y)), move };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = points.length
    ? `${path} L ${width} ${height / 2} L 0 ${height / 2} Z`
    : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mb-5 h-20 w-full bg-[#d8d8d8]"
      role="img"
      aria-label="Evaluation graph"
    >
      <rect width={width} height={height / 2} y={0} fill="#2e2e2e" />
      <rect width={width} height={height / 2} y={height / 2} fill="#d8d8d8" />
      <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="#b8b8b8" />
      {area ? <path d={area} fill="#efefef" opacity="0.92" /> : null}
      {path ? <path d={path} fill="none" stroke="#f8f8f8" strokeWidth="2" /> : null}
      {points.map((point) => {
        const meta = point.move.classification
          ? CLASS_META[point.move.classification]
          : null;
        return (
          <circle
            key={point.move.ply}
            cx={point.x}
            cy={point.y}
            r="3.2"
            fill={meta?.hex ?? "#79b84a"}
            stroke="#1b1b1b"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

function PlayersSummary({
  whiteName,
  blackName,
  stats,
}: {
  whiteName: string;
  blackName: string;
  stats: ReturnType<typeof buildReviewStats>;
}) {
  return (
    <section className="border-y border-zinc-800 py-4">
      <div className="grid grid-cols-[120px_1fr_1fr] items-end gap-4">
        <span className="self-center text-sm font-black text-zinc-300">Players</span>
        <PlayerScore name={whiteName} tone="white" />
        <PlayerScore name={blackName} tone="black" />
        <span className="text-sm font-black text-zinc-300">Accuracy</span>
        <MetricBox>{formatAccuracy(stats.accuracy.white)}</MetricBox>
        <MetricBox>{formatAccuracy(stats.accuracy.black)}</MetricBox>
      </div>
    </section>
  );
}

function PlayerScore({ name, tone }: { name: string; tone: "white" | "black" }) {
  return (
    <div className="text-center">
      <p className="mb-2 truncate text-xs font-black text-zinc-300">{shortName(name)}</p>
      <div
        className={cn(
          "mx-auto flex size-16 items-center justify-center border-2 text-xl font-black",
          tone === "white"
            ? "border-[#79b84a] bg-zinc-200 text-zinc-950"
            : "border-zinc-700 bg-zinc-800 text-zinc-200",
        )}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
    </div>
  );
}

function MetricBox({ children }: { children: ReactNode }) {
  return (
    <span className="mx-auto inline-flex h-9 min-w-16 items-center justify-center bg-zinc-200 px-3 text-lg font-black tabular-nums text-zinc-900">
      {children}
    </span>
  );
}

function ClassificationTable({
  stats,
}: {
  stats: ReturnType<typeof buildReviewStats>;
}) {
  const rows = CLASS_ORDER.filter((key) =>
    ["brilliant", "great", "best", "mistake", "miss", "blunder"].includes(key),
  );

  return (
    <section className="border-b border-zinc-800 py-4">
      <div className="grid grid-cols-[1fr_64px_40px_64px] gap-y-3">
        {rows.map((key) => {
          const meta = CLASS_META[key];
          return (
            <div key={key} className="contents">
              <span className="text-sm font-black text-zinc-300">{meta.label}</span>
              <span className="text-center text-lg font-black tabular-nums" style={{ color: meta.hex }}>
                {stats.counts.white[key] ?? 0}
              </span>
              <span
                className={cn(
                  "mx-auto flex size-6 items-center justify-center text-[11px] font-black",
                  meta.badge,
                  meta.text,
                )}
              >
                {meta.symbol}
              </span>
              <span className="text-center text-lg font-black tabular-nums" style={{ color: meta.hex }}>
                {stats.counts.black[key] ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PhaseTable({ stats }: { stats: ReturnType<typeof buildReviewStats> }) {
  const whiteRating = stats.accuracy.white
    ? Math.round(600 + stats.accuracy.white * 12)
    : 1150;
  const blackRating = stats.accuracy.black
    ? Math.round(600 + stats.accuracy.black * 12)
    : 1150;

  return (
    <section className="border-b border-zinc-800 py-4">
      <div className="grid grid-cols-[1fr_80px_80px] gap-y-3 text-sm font-black">
        <span className="text-zinc-300">Game Rating</span>
        <MetricBox>{whiteRating}</MetricBox>
        <MetricBox>{blackRating}</MetricBox>
        <span className="text-zinc-300">Opening</span>
        <StatusDot label="Needs work" tone="warn" />
        <StatusDot label="Good" tone="good" />
        <span className="text-zinc-300">Middlegame</span>
        <StatusDot label="Good" tone="good" />
        <StatusDot label="Good" tone="good" />
      </div>
    </section>
  );
}

function StatusDot({ label, tone }: { label: string; tone: "good" | "warn" }) {
  return (
    <span
      title={label}
      className={cn(
        "mx-auto flex size-6 items-center justify-center text-sm font-black text-zinc-950",
        tone === "good" ? "bg-[#79b84a]" : "bg-sky-400",
      )}
    >
      {tone === "good" ? "✓" : "!"}
    </span>
  );
}

function BestLine({
  fen,
  update,
  showBestMove,
}: {
  fen: string;
  update: AnalysisUpdate | null;
  showBestMove: boolean;
}) {
  const sideToMove = fenSideToMove(fen);
  const topLine = update?.lines[0] ?? null;
  const bestUci = update?.bestMove ?? topLine?.pv[0] ?? null;
  const bestSan = bestUci ? uciToSan(fen, bestUci) : null;

  return (
    <section className="border-b border-zinc-800 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-zinc-300">Engine Line</h2>
        {topLine ? (
          <span className="font-mono text-sm font-black text-zinc-100">
            {formatScore(toWhitePov(topLine.score, sideToMove))}
          </span>
        ) : null}
      </div>
      <p className="mb-2 font-mono text-lg font-black text-[#79b84a]">
        {showBestMove && bestSan ? bestSan : "Waiting for engine…"}
      </p>
      <div className="space-y-1">
        {update?.lines.length ? (
          update.lines.map((line) => (
            <p
              key={line.multipv}
              className="truncate bg-[#121212] px-2 py-1 font-mono text-xs text-zinc-400"
            >
              <span className="mr-2 font-bold text-zinc-200">
                {formatScore(toWhitePov(line.score, sideToMove))}
              </span>
              {uciLineToSan(fen, line.pv, 8).join(" ")}
            </p>
          ))
        ) : (
          <p className="font-mono text-xs text-zinc-600">No line yet.</p>
        )}
      </div>
    </section>
  );
}

function MoveList({
  moves,
  currentPly,
  onSelect,
}: {
  moves: ListMove[];
  currentPly: number;
  onSelect: (ply: number) => void;
}) {
  const pairs = toPairs(moves);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = listRef.current;
    const el = container?.querySelector<HTMLElement>("[data-active='true']");
    if (!container || !el) return;

    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    if (elTop < container.scrollTop) {
      container.scrollTop = elTop;
    } else if (elBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = elBottom - container.clientHeight;
    }
  }, [currentPly]);

  return (
    <section className="py-4">
      <h2 className="mb-3 text-sm font-black text-zinc-300">Moves</h2>
      <div
        ref={listRef}
        className="max-h-72 overflow-y-auto border border-zinc-800 bg-[#141414]"
      >
        <div className="grid grid-cols-[42px_1fr_1fr]">
          {pairs.map((pair) => (
            <div key={pair.moveNumber} className="contents">
              <span className="border-b border-zinc-800 px-2 py-1.5 text-right font-mono text-xs text-zinc-600">
                {pair.moveNumber}.
              </span>
              <MoveCell
                move={pair.white}
                active={pair.white?.ply === currentPly}
                onSelect={onSelect}
              />
              <MoveCell
                move={pair.black}
                active={pair.black?.ply === currentPly}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MoveCell({
  move,
  active,
  onSelect,
}: {
  move?: ListMove;
  active: boolean;
  onSelect: (ply: number) => void;
}) {
  if (!move) {
    return <span className="border-b border-zinc-800" />;
  }
  const meta = move.classification ? CLASS_META[move.classification] : null;
  return (
    <button
      type="button"
      onClick={() => onSelect(move.ply)}
      data-active={active}
      className={cn(
        "flex min-w-0 items-center gap-1 border-b border-zinc-800 px-2 py-1.5 text-left font-mono text-sm hover:bg-zinc-800",
        active ? "bg-zinc-200 font-black text-zinc-950 hover:bg-zinc-200" : "text-zinc-300",
      )}
    >
      <span className="truncate">{move.san}</span>
      {meta ? (
        <span className="ml-auto text-[10px] font-black" style={{ color: active ? "#111111" : meta.hex }}>
          {meta.symbol}
        </span>
      ) : null}
    </button>
  );
}
