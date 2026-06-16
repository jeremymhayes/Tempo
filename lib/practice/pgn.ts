import { Chess } from "chess.js";
import type { GameResult, PieceColor } from "@/types/chess";

export type PracticeFinishReason = "checkmate" | "draw" | "resignation";

export type PracticeResultOptions = {
  resignedBy?: PieceColor;
};

export function getPracticeResult(
  chess: Chess,
  options: PracticeResultOptions = {},
): GameResult {
  if (options.resignedBy) {
    return options.resignedBy === "w" ? "0-1" : "1-0";
  }

  if (chess.isCheckmate()) {
    return chess.turn() === "w" ? "0-1" : "1-0";
  }

  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
    return "1/2-1/2";
  }

  return "*";
}

export function formatPgnDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join(".");
}

export function buildPracticePgn({
  chess,
  playerColor,
  botElo,
  result,
  finishedAt = new Date(),
}: {
  chess: Chess;
  playerColor: PieceColor;
  botElo: number;
  result: GameResult;
  finishedAt?: Date;
}) {
  const botName = `Tempo Bot ${botElo}`;
  chess.setHeader("Event", "Tempo Practice");
  chess.setHeader("Site", "Tempo");
  chess.setHeader("Date", formatPgnDate(finishedAt));
  chess.setHeader("Round", "-");
  chess.setHeader("White", playerColor === "w" ? "Player" : botName);
  chess.setHeader("Black", playerColor === "w" ? botName : "Player");
  chess.setHeader("Result", result);

  return chess.pgn({ newline: "\n", maxWidth: 80 });
}
