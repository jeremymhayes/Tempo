import type { MoveClassification } from "@/types/review";

export interface ClassMeta {
  label: string;
  /** Short glyph shown inside the badge bubble. */
  symbol: string;
  /** Badge background (Tailwind class). */
  badge: string;
  /** Badge glyph color (Tailwind class). */
  text: string;
  /** Solid hex, for SVG arrows / rings. */
  hex: string;
}

export const CLASS_META: Record<MoveClassification, ClassMeta> = {
  brilliant: { label: "Brilliant", symbol: "!!", badge: "bg-cyan-400", text: "text-cyan-950", hex: "#22d3ee" },
  great: { label: "Great", symbol: "!", badge: "bg-sky-400", text: "text-sky-950", hex: "#38bdf8" },
  best: { label: "Best", symbol: "★", badge: "bg-emerald-500", text: "text-emerald-950", hex: "#10b981" },
  good: { label: "Good", symbol: "✓", badge: "bg-lime-500", text: "text-lime-950", hex: "#84cc16" },
  book: { label: "Book", symbol: "♘", badge: "bg-amber-600", text: "text-amber-50", hex: "#d97706" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", badge: "bg-yellow-400", text: "text-yellow-950", hex: "#facc15" },
  miss: { label: "Miss", symbol: "✕", badge: "bg-rose-500", text: "text-rose-50", hex: "#f43f5e" },
  mistake: { label: "Mistake", symbol: "?", badge: "bg-orange-500", text: "text-orange-950", hex: "#f97316" },
  blunder: { label: "Blunder", symbol: "??", badge: "bg-red-600", text: "text-red-50", hex: "#dc2626" },
};

/** Display order, best → worst. */
export const CLASS_ORDER: MoveClassification[] = [
  "brilliant",
  "great",
  "best",
  "good",
  "book",
  "inaccuracy",
  "miss",
  "mistake",
  "blunder",
];
