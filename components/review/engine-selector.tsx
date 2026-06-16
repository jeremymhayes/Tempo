"use client";

import { Select } from "@/components/ui/select";
import { ENGINES } from "@/lib/engine/registry";
import type { EngineId } from "@/lib/engine/types";

export function EngineSelector({
  value,
  onChange,
}: {
  value: EngineId;
  onChange: (id: EngineId) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as EngineId)}
      aria-label="Analysis engine"
    >
      {ENGINES.map((engine) => (
        <option key={engine.id} value={engine.id} disabled={!engine.available}>
          {engine.name}
          {engine.available ? "" : " — unavailable"}
        </option>
      ))}
    </Select>
  );
}
