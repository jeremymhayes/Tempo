"use client";

import { cn } from "@/lib/utils";

/** Minimal controlled toggle. No external dependency. */
export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
        "disabled:opacity-40",
        checked ? "bg-zinc-200" : "bg-zinc-700",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-zinc-950 transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
