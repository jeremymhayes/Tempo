"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Bot,
  Flag,
  Loader2,
  Play,
  RotateCcw,
  Shield,
  Swords,
} from "lucide-react";
import type { PieceColor } from "@/types/chess";
import type { AnalysisEngine } from "@/lib/engine/types";
import { createEngine } from "@/lib/engine";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import { saveCurrentGame } from "@/lib/storage";
import {
  eloToBotConfig,
  PRACTICE_BOT_ELOS,
  type PracticeBotElo,
} from "@/lib/practice/bot";
import { buildPracticePgn, getPracticeResult } from "@/lib/practice/pgn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LIGHT = "#e8edd0";
const DARK = "#6f9b4f";
const LAST_MOVE = "rgba(245, 209, 66, 0.42)";
const LEGAL_DROP = "rgba(56, 189, 120, 0.24)";

type BotStatus = "idle" | "loading" | "thinking" | "fallback" | "error";

function formatSide(side: PieceColor) {
  return side === "w" ? "White" : "Black";
}

function opposite(side: PieceColor): PieceColor {
  return side === "w" ? "b" : "w";
}

function isPlayerPiece(pieceType: string, playerColor: PieceColor) {
  return pieceType.toLowerCase().startsWith(playerColor);
}

function uciToMove(uci: string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4],
  };
}

function gameStatus(chess: Chess, playerColor: PieceColor) {
  if (chess.isCheckmate()) {
    const winner = opposite(chess.turn() as PieceColor);
    return winner === playerColor ? "Checkmate. You won." : "Checkmate. Bot won.";
  }
  if (chess.isStalemate()) return "Draw by stalemate.";
  if (chess.isInsufficientMaterial()) return "Draw by insufficient material.";
  if (chess.isThreefoldRepetition()) return "Draw by repetition.";
  if (chess.isDrawByFiftyMoves()) return "Draw by fifty-move rule.";
  if (chess.isDraw()) return "Draw.";
  return chess.turn() === playerColor ? "Your move" : "Bot thinking";
}

function moveLabel(move: Move, index: number) {
  const moveNumber = Math.floor(index / 2) + 1;
  return `${moveNumber}${move.color === "w" ? "." : "..."} ${move.san}`;
}

function chooseFallbackMove(chess: Chess) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const captures = moves.filter((move) => move.isCapture());
  const candidates = captures.length ? captures : moves;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export function PracticeClient() {
  const router = useRouter();
  const [playerColor, setPlayerColor] = useState<PieceColor>("w");
  const [botElo, setBotElo] = useState<PracticeBotElo>(1200);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus>("idle");
  const [position, setPosition] = useState(() => new Chess().fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [error, setError] = useState<string | null>(null);

  const chessRef = useRef(new Chess());
  const engineRef = useRef<AnalysisEngine | null>(null);
  const engineReadyRef = useRef(false);
  const requestRef = useRef(0);
  const botThinkingRef = useRef(false);
  const playerColorRef = useRef(playerColor);
  const botEloRef = useRef(botElo);
  const finishedRef = useRef(finished);

  const botConfig = useMemo(() => eloToBotConfig(botElo), [botElo]);
  const sideToMove = position.split(" ")[1] as PieceColor;
  const isPlayerTurn = started && !finished && sideToMove === playerColor;
  const viewChess = useMemo(() => new Chess(position), [position]);
  const status = gameStatus(viewChess, playerColor);
  const displayStatus = !started ? "Ready" : finished ? "Reviewing game" : status;
  const legalTargets = useMemo(
    () => (isPlayerTurn ? viewChess.moves({ verbose: true }).map((move) => move.to) : []),
    [isPlayerTurn, viewChess],
  );

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    botEloRef.current = botElo;
  }, [botElo]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      engineRef.current?.dispose();
    };
  }, []);

  const syncGame = useCallback(() => {
    const chess = chessRef.current;
    setPosition(chess.fen());
    setHistory(chess.history({ verbose: true }));
  }, []);

  const ensureEngine = useCallback(async () => {
    if (engineRef.current && engineReadyRef.current) return engineRef.current;

    setBotStatus("loading");
    const engine = createEngine("stockfish");
    engineRef.current = engine;
    await engine.init();
    engineReadyRef.current = true;
    return engine;
  }, []);

  const finishAndReview = useCallback(
    (result: "1-0" | "0-1" | "1/2-1/2") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      requestRef.current += 1;
      engineRef.current?.stop();

      const parsed = parsePgnForReview(
        buildPracticePgn({
          chess: chessRef.current,
          playerColor: playerColorRef.current,
          botElo: botEloRef.current,
          result,
        }),
      );

      if (!parsed.ok) {
        setError(parsed.error);
        setFinished(false);
        finishedRef.current = false;
        return;
      }

      saveCurrentGame(parsed.game);
      router.push("/review");
    },
    [router],
  );

  const reviewIfGameOver = useCallback(() => {
    const result = getPracticeResult(chessRef.current);
    if (result !== "*") finishAndReview(result);
  }, [finishAndReview]);

  const applyBotMove = useCallback(
    (uci: string | null) => {
      const chess = chessRef.current;
      let played: Move | null = null;
      const move = uci ? uciToMove(uci) : null;

      if (move) {
        try {
          played = chess.move(move);
        } catch {
          played = null;
        }
      }

      if (!played) {
        const fallback = chooseFallbackMove(chess);
        if (fallback) {
          played = chess.move({
            from: fallback.from,
            to: fallback.to,
            promotion: fallback.promotion,
          });
          setBotStatus("fallback");
        }
      }

      botThinkingRef.current = false;
      if (!played) {
        setBotStatus("error");
        setError("The bot could not find a legal move.");
        return;
      }

      setBotStatus("idle");
      syncGame();
      reviewIfGameOver();
    },
    [reviewIfGameOver, syncGame],
  );

  const makeBotMove = useCallback(async () => {
    if (botThinkingRef.current || finishedRef.current) return;
    botThinkingRef.current = true;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setBotStatus("thinking");
    setError(null);

    try {
      const engine = await ensureEngine();
      const config = eloToBotConfig(botEloRef.current);
      engine.analyze(
        chessRef.current.fen(),
        {
          depth: config.depth,
          movetime: config.movetime,
          multiPV: 1,
          skill: config.skill,
        },
        (update) => {
          if (requestRef.current !== requestId || !update.done) return;
          applyBotMove(update.bestMove ?? update.lines[0]?.pv[0] ?? null);
        },
      );
    } catch (cause) {
      if (requestRef.current !== requestId) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "The engine failed to start. Using legal fallback moves.",
      );
      applyBotMove(null);
    }
  }, [applyBotMove, ensureEngine]);

  useEffect(() => {
    if (!started || finished) return;
    if (sideToMove === playerColor) return;
    void makeBotMove();
  }, [finished, makeBotMove, playerColor, sideToMove, started]);

  const startGame = useCallback(() => {
    requestRef.current += 1;
    botThinkingRef.current = false;
    engineRef.current?.stop();
    chessRef.current = new Chess();
    setStarted(true);
    setFinished(false);
    finishedRef.current = false;
    setBotStatus("idle");
    setError(null);
    syncGame();
  }, [syncGame]);

  const resign = useCallback(() => {
    if (!started || finished || history.length === 0) return;
    const result = getPracticeResult(chessRef.current, { resignedBy: playerColor });
    if (result !== "*") finishAndReview(result);
  }, [finishAndReview, finished, history.length, playerColor, started]);

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare || !isPlayerTurn || botThinkingRef.current) return false;

      try {
        const move = chessRef.current.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: "q",
        });
        if (!move) return false;
      } catch {
        return false;
      }

      setError(null);
      syncGame();
      reviewIfGameOver();
      return true;
    },
    [isPlayerTurn, reviewIfGameOver, syncGame],
  );

  const lastMove = history.at(-1);
  const lastMoveIndex = history.length - 1;
  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: LAST_MOVE };
      styles[lastMove.to] = { background: LAST_MOVE };
    }
    if (isPlayerTurn) {
      for (const target of legalTargets) {
        styles[target] = {
          ...(styles[target] ?? {}),
          boxShadow: `inset 0 0 0 3px ${LEGAL_DROP}`,
        };
      }
    }
    return styles;
  }, [isPlayerTurn, lastMove, legalTargets]);

  const moveRows = useMemo(() => {
    const rows: Array<{ number: number; white?: Move; black?: Move }> = [];
    for (const [index, move] of history.entries()) {
      const moveNumber = Math.floor(index / 2) + 1;
      const rowIndex = moveNumber - 1;
      rows[rowIndex] ??= { number: moveNumber };
      if (move.color === "w") rows[rowIndex].white = move;
      else rows[rowIndex].black = move;
    }
    return rows;
  }, [history]);

  return (
    <div className="grid min-h-[calc(100vh-7rem)] gap-5 xl:grid-cols-[minmax(560px,1fr)_360px]">
      <section className="flex min-h-[640px] flex-col border border-zinc-800 bg-[#151515]">
        <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-zinc-500">
              Practice Board
            </p>
            <p className="text-sm font-bold text-zinc-100">{displayStatus}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            {botStatus === "loading" || botStatus === "thinking" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bot className="size-4" />
            )}
            <span>{botConfig.elo} Elo</span>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="w-full max-w-[min(78vh,720px)]">
            <Chessboard
              options={{
                id: "practice-board",
                position,
                boardOrientation: playerColor === "b" ? "black" : "white",
                allowDragging: isPlayerTurn,
                allowDrawingArrows: false,
                showAnimations: true,
                animationDurationInMs: 160,
                darkSquareStyle: { backgroundColor: DARK },
                lightSquareStyle: { backgroundColor: LIGHT },
                boardStyle: { borderRadius: "0px" },
                squareStyles,
                canDragPiece: ({ piece }) =>
                  Boolean(piece && isPlayerTurn && isPlayerPiece(piece.pieceType, playerColor)),
                onPieceDrop,
              }}
            />
          </div>
          {!started ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <Button type="button" size="lg" onClick={startGame}>
                <Play className="size-4" />
                Start Game
              </Button>
            </div>
          ) : null}
        </div>

        <footer className="flex h-14 items-center justify-between border-t border-zinc-800 bg-[#101010] px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-500">
              {formatSide(playerColor)} vs Tempo Bot {botConfig.elo}
            </p>
            <p className="truncate font-mono text-sm text-zinc-100">
              {lastMove ? moveLabel(lastMove, lastMoveIndex) : "Starting position"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startGame}
              disabled={botStatus === "loading" || botStatus === "thinking"}
            >
              <RotateCcw className="size-3.5" />
              New Game
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={resign}
              disabled={!started || finished || history.length === 0}
            >
              <Flag className="size-3.5" />
              Resign
            </Button>
          </div>
        </footer>
      </section>

      <aside className="grid content-start gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bot Rating
              </label>
              <Select
                value={String(botElo)}
                onValueChange={(value) => setBotElo(Number(value) as PracticeBotElo)}
                disabled={started && !finished}
              >
                <SelectTrigger className="h-9 w-full rounded-md border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_BOT_ELOS.map((elo) => (
                    <SelectItem key={elo} value={String(elo)}>
                      {elo} Elo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Side
              </label>
              <Select
                value={playerColor}
                onValueChange={(value) => setPlayerColor(value as PieceColor)}
                disabled={started && !finished}
              >
                <SelectTrigger className="h-9 w-full rounded-md border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="w">White</SelectItem>
                  <SelectItem value="b">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-4">
              <Stat label="Skill" value={String(botConfig.skill)} />
              <Stat label="Depth" value={String(botConfig.depth)} />
              <Stat label="Move" value={`${botConfig.movetime}ms`} />
            </div>

            {error ? (
              <p className="border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>Moves</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[28rem] overflow-y-auto p-0">
            {moveRows.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-zinc-600">
                No moves yet
              </div>
            ) : (
              <ol className="divide-y divide-zinc-900">
                {moveRows.map((row) => (
                  <li
                    key={row.number}
                    className="grid grid-cols-[3rem_1fr_1fr] items-center px-4 py-2 font-mono text-sm"
                  >
                    <span className="text-xs text-zinc-600">{row.number}</span>
                    <span
                      className={cn(
                        "truncate text-zinc-300",
                        row.white === lastMove ? "font-bold text-zinc-50" : "",
                      )}
                    >
                      {row.white?.san ?? ""}
                    </span>
                    <span
                      className={cn(
                        "truncate text-zinc-300",
                        row.black === lastMove ? "font-bold text-zinc-50" : "",
                      )}
                    >
                      {row.black?.san ?? ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatusTile icon={<Swords className="size-4" />} label="You" value={formatSide(playerColor)} />
            <StatusTile
              icon={<Shield className="size-4" />}
              label="Bot"
              value={formatSide(opposite(playerColor))}
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div className="text-zinc-500">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">
          {label}
        </p>
        <p className="text-sm font-semibold text-zinc-200">{value}</p>
      </div>
    </div>
  );
}
