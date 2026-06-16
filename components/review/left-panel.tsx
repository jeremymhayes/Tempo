"use client";

import { useState } from "react";
import { Cpu, Loader2, RefreshCw, Settings2 } from "lucide-react";
import type { ParsedGame } from "@/types/chess";
import type { EngineStatus } from "@/lib/engine/types";
import type { AnalysisSettings } from "@/lib/engine/settings";
import {
  advantage,
  advantageLabel,
  formatScore,
  whiteWinPercent,
  type WhiteScore,
} from "@/lib/engine/eval-format";
import { cn } from "@/lib/utils";
import { EngineSelector } from "./engine-selector";
import { AnalysisSettingsPanel } from "./analysis-settings";

function PlayerStrip({
  name,
  side,
  toMove,
}: {
  name: string;
  side: "w" | "b";
  toMove: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        toMove
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          side === "w" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-700 text-zinc-100",
        )}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{name}</p>
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">
          {side === "w" ? "White" : "Black"}
        </p>
      </div>
      {toMove ? (
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
      ) : null}
    </div>
  );
}

const STATUS: Record<EngineStatus, { label: string; cls: string; spin?: boolean }> = {
  idle: { label: "Idle", cls: "text-zinc-500" },
  loading: { label: "Loading engine", cls: "text-amber-300", spin: true },
  ready: { label: "Ready", cls: "text-emerald-400" },
  analyzing: { label: "Analyzing", cls: "text-sky-400", spin: true },
  error: { label: "Error", cls: "text-rose-400" },
};

export function LeftPanel({
  game,
  sideToMove,
  status,
  error,
  whiteScore,
  depth,
  settings,
  onSettingsChange,
  onAnalyzeNow,
}: {
  game: ParsedGame;
  sideToMove: "w" | "b";
  status: EngineStatus;
  error: string | null;
  whiteScore: WhiteScore | null;
  depth: number;
  settings: AnalysisSettings;
  onSettingsChange: (patch: Partial<AnalysisSettings>) => void;
  onAnalyzeNow: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const st = STATUS[status];
  const whitePct = whiteScore ? whiteWinPercent(whiteScore) : 50;
  const adv = whiteScore ? advantage(whiteScore) : "equal";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PlayerStrip name={game.black} side="b" toMove={sideToMove === "b"} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        {/* Evaluation */}
        <div>
          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                "font-mono text-4xl font-bold tabular-nums",
                adv === "white"
                  ? "text-zinc-50"
                  : adv === "black"
                    ? "text-zinc-300"
                    : "text-zinc-400",
              )}
            >
              {whiteScore ? formatScore(whiteScore) : "—"}
            </span>
            <span className="text-[11px] text-zinc-500">
              {depth ? `d${depth}` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-400">
            {whiteScore
              ? advantageLabel(whiteScore)
              : status === "loading"
                ? "Starting engine…"
                : "No evaluation yet"}
          </p>
          <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-zinc-700 ring-1 ring-black/30">
            <div
              className="bg-gradient-to-r from-zinc-100 to-white transition-[width] duration-500"
              style={{ width: `${whitePct}%` }}
            />
          </div>
        </div>

        {/* Engine controls */}
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              <Cpu className="size-3.5" />
              Engine
            </span>
            <span className={cn("inline-flex items-center gap-1 text-[11px]", st.cls)}>
              {st.spin ? <Loader2 className="size-3 animate-spin" /> : null}
              {st.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <EngineSelector
                value={settings.engineId}
                onChange={(id) => onSettingsChange({ engineId: id })}
              />
            </div>
            <button
              type="button"
              aria-label="Analyze now"
              onClick={onAnalyzeNow}
              disabled={status !== "ready" && status !== "analyzing"}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Analysis settings"
              aria-pressed={showSettings}
              onClick={() => setShowSettings((v) => !v)}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                showSettings
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 text-zinc-300 hover:bg-white/10",
              )}
            >
              <Settings2 className="size-4" />
            </button>
          </div>

          {error ? (
            <p className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-300">
              {error}
            </p>
          ) : null}
        </div>

        {/* Settings (scrolls within the panel) */}
        {showSettings ? (
          <div className="-mx-4 min-h-0 flex-1 overflow-y-auto border-t border-white/10">
            <AnalysisSettingsPanel settings={settings} onChange={onSettingsChange} />
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}
      </div>

      <PlayerStrip name={game.white} side="w" toMove={sideToMove === "w"} />
    </div>
  );
}
