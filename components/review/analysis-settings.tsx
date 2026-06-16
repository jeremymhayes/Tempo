"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  SETTINGS_BOUNDS,
  type AnalysisSettings,
} from "@/lib/engine/settings";

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <Label>{label}</Label>
        {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      </div>
      <div className="w-40 shrink-0">{control}</div>
    </div>
  );
}

export function AnalysisSettingsPanel({
  settings,
  onChange,
}: {
  settings: AnalysisSettings;
  onChange: (patch: Partial<AnalysisSettings>) => void;
}) {
  const b = SETTINGS_BOUNDS;

  return (
    <div className="divide-y divide-zinc-800 px-4">
      <Row
        label="Limit by"
        hint="How each search is bounded."
        control={
          <Select
            value={settings.mode}
            onChange={(e) =>
              onChange({ mode: e.target.value as AnalysisSettings["mode"] })
            }
          >
            <option value="depth">Depth</option>
            <option value="time">Time</option>
          </Select>
        }
      />

      {settings.mode === "depth" ? (
        <Row
          label="Search depth"
          hint={`${settings.depth} plies`}
          control={
            <input
              type="range"
              min={b.depth.min}
              max={b.depth.max}
              value={settings.depth}
              onChange={(e) => onChange({ depth: Number(e.target.value) })}
              className="w-full accent-zinc-200"
            />
          }
        />
      ) : (
        <Row
          label="Time per move"
          hint={`${(settings.movetime / 1000).toFixed(1)}s`}
          control={
            <input
              type="range"
              min={b.movetime.min}
              max={b.movetime.max}
              step={b.movetime.step}
              value={settings.movetime}
              onChange={(e) => onChange({ movetime: Number(e.target.value) })}
              className="w-full accent-zinc-200"
            />
          }
        />
      )}

      <Row
        label="Lines (MultiPV)"
        hint="Candidate moves to show."
        control={
          <Select
            value={String(settings.multiPV)}
            onChange={(e) => onChange({ multiPV: Number(e.target.value) })}
          >
            {Array.from(
              { length: b.multiPV.max - b.multiPV.min + 1 },
              (_, i) => b.multiPV.min + i,
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        }
      />

      <Row
        label="Engine strength"
        hint={`Skill level ${settings.skill} / ${b.skill.max}`}
        control={
          <input
            type="range"
            min={b.skill.min}
            max={b.skill.max}
            value={settings.skill}
            onChange={(e) => onChange({ skill: Number(e.target.value) })}
            className="w-full accent-zinc-200"
          />
        }
      />

      <Row
        label="Auto-analyze"
        hint="Analyze when the move changes."
        control={
          <div className="flex justify-end">
            <Switch
              checked={settings.autoAnalyze}
              onCheckedChange={(v) => onChange({ autoAnalyze: v })}
            />
          </div>
        }
      />

      <Row
        label="Evaluation bar"
        control={
          <div className="flex justify-end">
            <Switch
              checked={settings.showEvalBar}
              onCheckedChange={(v) => onChange({ showEvalBar: v })}
            />
          </div>
        }
      />

      <Row
        label="Show best move"
        control={
          <div className="flex justify-end">
            <Switch
              checked={settings.showBestMove}
              onCheckedChange={(v) => onChange({ showBestMove: v })}
            />
          </div>
        }
      />
    </div>
  );
}
