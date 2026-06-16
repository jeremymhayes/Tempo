"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Lightbulb,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisUpdate, EngineStatus } from "@/lib/engine/types";
import type { AnalysisSettings } from "@/lib/engine/settings";
import {
  advantage,
  advantageLabel,
  fenSideToMove,
  formatScore,
  toWhitePov,
} from "@/lib/engine/eval-format";
import { uciLineToSan, uciToSan } from "@/lib/engine/san";
import { EngineSelector } from "./engine-selector";
import { AnalysisSettingsPanel } from "./analysis-settings";

const ADV_COLOR = {
  white: "text-zinc-100",
  black: "text-zinc-100",
  equal: "text-zinc-400",
} as const;

function StatusBadge({ status }: { status: EngineStatus }) {
  const map: Record<EngineStatus, { label: string; className: string; spin?: boolean }> = {
    idle: { label: "Idle", className: "text-zinc-500" },
    loading: { label: "Loading engine", className: "text-amber-300", spin: true },
    ready: { label: "Ready", className: "text-emerald-400" },
    analyzing: { label: "Analyzing", className: "text-sky-400", spin: true },
    error: { label: "Error", className: "text-red-400" },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", s.className)}>
      {s.spin ? <Loader2 className="size-3 animate-spin" /> : null}
      {s.label}
    </span>
  );
}

export function AnalysisPanel({
  fen,
  status,
  error,
  update,
  settings,
  onSettingsChange,
  onAnalyzeNow,
}: {
  fen: string;
  status: EngineStatus;
  error: string | null;
  update: AnalysisUpdate | null;
  settings: AnalysisSettings;
  onSettingsChange: (patch: Partial<AnalysisSettings>) => void;
  onAnalyzeNow: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  const sideToMove = fenSideToMove(fen);
  const topLine = update?.lines[0] ?? null;
  const whiteScore = topLine ? toWhitePov(topLine.score, sideToMove) : null;
  const bestUci = update?.bestMove ?? topLine?.pv[0] ?? null;
  const bestSan = bestUci ? uciToSan(fen, bestUci) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Cpu className="size-3.5" />
          Engine
        </CardTitle>
        <StatusBadge status={status} />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <EngineSelector
              value={settings.engineId}
              onChange={(id) => onSettingsChange({ engineId: id })}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Analysis settings"
            aria-pressed={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Analyze now"
            onClick={onAnalyzeNow}
            disabled={status !== "ready" && status !== "analyzing"}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Evaluation readout */}
        <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums",
                whiteScore ? ADV_COLOR[advantage(whiteScore)] : "text-zinc-600",
              )}
            >
              {whiteScore ? formatScore(whiteScore) : "—"}
            </span>
            <span className="text-xs text-zinc-500">
              {update?.depth ? `depth ${update.depth}` : ""}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            {whiteScore
              ? advantageLabel(whiteScore)
              : status === "loading"
                ? "Starting engine…"
                : status === "error"
                  ? "Engine unavailable"
                  : "No evaluation yet"}
          </p>

          {settings.showBestMove ? (
            <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-3">
              <Lightbulb className="size-3.5 text-emerald-400" />
              <span className="text-xs text-zinc-500">Best move</span>
              <span className="ml-auto font-mono text-sm font-semibold text-emerald-300">
                {bestSan ?? "—"}
              </span>
            </div>
          ) : null}
        </div>

        {/* Principal variations */}
        {update && update.lines.length > 0 ? (
          <ol className="space-y-1.5">
            {update.lines.map((line) => {
              const ws = toWhitePov(line.score, sideToMove);
              const san = uciLineToSan(fen, line.pv, 8);
              return (
                <li
                  key={line.multipv}
                  className="flex gap-2 rounded-md border border-zinc-800/70 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-mono font-semibold tabular-nums text-zinc-300">
                    {formatScore(ws)}
                  </span>
                  <span className="truncate font-mono text-zinc-500">
                    {san.join(" ")}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {showSettings ? (
          <div className="-mx-4 border-t border-zinc-800 pt-1">
            <AnalysisSettingsPanel
              settings={settings}
              onChange={onSettingsChange}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
