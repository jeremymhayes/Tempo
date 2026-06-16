"use client";

import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface SettingsState {
  orientation: "white" | "black";
  depth: number;
  notation: "san" | "uci" | "figurine";
  autoAdvance: boolean;
}

const DEFAULTS: SettingsState = {
  orientation: "white",
  depth: 18,
  notation: "san",
  autoAdvance: false,
};

function Field({
  label,
  hint,
  htmlFor,
  control,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      <div className="w-44 shrink-0">{control}</div>
    </div>
  );
}

export function SettingsForm() {
  const [s, setS] = useState<SettingsState>(DEFAULTS);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <span className="text-xs text-zinc-600">Saved locally for now</span>
      </CardHeader>
      <CardContent className="divide-y divide-zinc-800 py-0">
        <Field
          label="Board orientation"
          hint="Default side shown at the bottom of the board."
          htmlFor="orientation"
          control={
            <Select
              value={s.orientation}
              onValueChange={(orientation) =>
                setS({
                  ...s,
                  orientation: orientation as SettingsState["orientation"],
                })
              }
            >
              <SelectTrigger id="orientation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
        <Field
          label="Analysis depth"
          hint={`Engine search depth (placeholder): ${s.depth}`}
          htmlFor="depth"
          control={
            <input
              id="depth"
              type="range"
              min={10}
              max={30}
              value={s.depth}
              onChange={(e) => setS({ ...s, depth: Number(e.target.value) })}
              className="w-full accent-zinc-200"
            />
          }
        />
        <Field
          label="Notation style"
          hint="How moves are written in the move list."
          htmlFor="notation"
          control={
            <Select
              value={s.notation}
              onValueChange={(notation) =>
                setS({
                  ...s,
                  notation: notation as SettingsState["notation"],
                })
              }
            >
              <SelectTrigger id="notation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="san">SAN (Nf3)</SelectItem>
                  <SelectItem value="uci">UCI (g1f3)</SelectItem>
                  <SelectItem value="figurine">Figurine (♘f3)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
        <Field
          label="Auto-advance moves"
          hint="Step forward automatically while reviewing."
          control={
            <div className="flex justify-end">
              <Switch
                checked={s.autoAdvance}
                onCheckedChange={(v) => setS({ ...s, autoAdvance: v })}
              />
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
