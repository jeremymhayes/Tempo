"use client";

import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SETTINGS_BOUNDS, type AnalysisSettings } from "@/lib/engine/settings";
import type { EngineStatus } from "@/lib/engine/types";

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_160px] items-center gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {value ? <p className="text-xs text-muted-foreground">{value}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function EngineSettingsPopover({
  settings,
  status,
  depth,
  liveAnalysisDisabledReason,
  onChange,
  onAnalyzeNow,
}: {
  settings: AnalysisSettings;
  status: EngineStatus;
  depth: number;
  liveAnalysisDisabledReason?: string | null;
  onChange: (patch: Partial<AnalysisSettings>) => void;
  onAnalyzeNow: () => void;
}) {
  const b = SETTINGS_BOUNDS;
  const liveAnalysisDisabled = Boolean(liveAnalysisDisabledReason);
  const multiPVOptions = Array.from(
    { length: b.multiPV.max - b.multiPV.min + 1 },
    (_, i) => b.multiPV.min + i,
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Engine settings"
        >
          <Settings data-icon="inline-start" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Engine settings
            </p>
            <p className="text-xs text-muted-foreground">
              {liveAnalysisDisabledReason ??
                `${status}${depth > 0 ? ` · depth ${depth}` : ""}`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={liveAnalysisDisabled}
            onClick={onAnalyzeNow}
          >
            Analyze now
          </Button>
        </div>

        <Separator />

        <div className="px-4">
          <SettingRow label="Limit by" value="How each search is bounded.">
            <Select
              value={settings.mode}
              onValueChange={(mode) =>
                onChange({ mode: mode as AnalysisSettings["mode"] })
              }
            >
              <SelectTrigger className="w-full" aria-label="Limit by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="depth">Depth</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          {settings.mode === "depth" ? (
            <SettingRow label="Depth" value={`${settings.depth} plies`}>
              <Slider
                aria-label="Depth"
                min={b.depth.min}
                max={b.depth.max}
                value={[settings.depth]}
                onValueChange={(value) =>
                  onChange({ depth: value[0] ?? settings.depth })
                }
              />
            </SettingRow>
          ) : (
            <SettingRow
              label="Time per move"
              value={`${(settings.movetime / 1000).toFixed(1)}s`}
            >
              <Slider
                aria-label="Time per move"
                min={b.movetime.min}
                max={b.movetime.max}
                step={b.movetime.step}
                value={[settings.movetime]}
                onValueChange={(value) =>
                  onChange({ movetime: value[0] ?? settings.movetime })
                }
              />
            </SettingRow>
          )}

          <Separator />

          <SettingRow label="Lines" value="Candidate moves to show.">
            <Select
              value={String(settings.multiPV)}
              onValueChange={(multiPV) => onChange({ multiPV: Number(multiPV) })}
            >
              <SelectTrigger className="w-full" aria-label="Lines">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {multiPVOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Skill level"
            value={`${settings.skill} / ${b.skill.max}`}
          >
            <Slider
              aria-label="Skill level"
              min={b.skill.min}
              max={b.skill.max}
              value={[settings.skill]}
              onValueChange={(value) =>
                onChange({ skill: value[0] ?? settings.skill })
              }
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Auto-analyze"
            value="Analyze when the move changes."
          >
            <div className="flex justify-end">
              <Switch
                aria-label="Auto-analyze"
                checked={settings.autoAnalyze}
                disabled={liveAnalysisDisabled}
                onCheckedChange={(autoAnalyze) => onChange({ autoAnalyze })}
              />
            </div>
          </SettingRow>

          <Separator />

          <SettingRow label="Evaluation bar">
            <div className="flex justify-end">
              <Switch
                aria-label="Evaluation bar"
                checked={settings.showEvalBar}
                onCheckedChange={(showEvalBar) => onChange({ showEvalBar })}
              />
            </div>
          </SettingRow>

          <Separator />

          <SettingRow label="Best move arrow">
            <div className="flex justify-end">
              <Switch
                aria-label="Best move arrow"
                checked={settings.showBestMove}
                onCheckedChange={(showBestMove) => onChange({ showBestMove })}
              />
            </div>
          </SettingRow>
        </div>
      </PopoverContent>
    </Popover>
  );
}
