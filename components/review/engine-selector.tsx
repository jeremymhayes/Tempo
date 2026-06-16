"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      onValueChange={(id) => onChange(id as EngineId)}
    >
      <SelectTrigger aria-label="Analysis engine">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {ENGINES.map((engine) => (
            <SelectItem
              key={engine.id}
              value={engine.id}
              disabled={!engine.available}
            >
              {engine.name}
              {engine.available ? "" : " — unavailable"}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
