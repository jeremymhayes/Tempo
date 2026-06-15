"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function MoveControls({
  onStart,
  onPrev,
  onNext,
  onEnd,
  atStart,
  atEnd,
}: {
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  atStart: boolean;
  atEnd: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        onClick={onStart}
        disabled={atStart}
        aria-label="Jump to start"
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous move"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next move"
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onEnd}
        disabled={atEnd}
        aria-label="Jump to end"
      >
        <ChevronsRight className="size-4" />
      </Button>
    </div>
  );
}
