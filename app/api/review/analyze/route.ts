import { NextRequest, NextResponse } from "next/server";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import { ServerStockfishEngine } from "@/lib/engine/server-stockfish-engine";
import { analyzeGameWithEngine } from "@/lib/review/engine-analysis";
import { getServerAnalysisConfig } from "@/lib/review/server-analysis-config";
import { serverAnalysisFailurePayload } from "@/lib/review/server-analysis-error";
import { tryAcquireServerAnalysisSlot } from "@/lib/review/server-analysis-limiter";
import { readAnalysisPgnBody } from "@/lib/review/server-analysis-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const config = getServerAnalysisConfig();
  if (!config.enabled) {
    return jsonError("Server analysis is not enabled", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const pgnBody = readAnalysisPgnBody(body, config.maxPgnLength);
  if (!pgnBody.ok) {
    return jsonError(pgnBody.error, pgnBody.status);
  }

  const parsed = parsePgnForReview(pgnBody.pgn);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  if (parsed.game.moves.length > config.maxMoves) {
    return jsonError("Game is too large for server analysis", 413);
  }

  const slot = tryAcquireServerAnalysisSlot(config.maxConcurrent);
  if (!slot) {
    return jsonError("Server analysis is busy", 503);
  }

  const engine = new ServerStockfishEngine(config.stockfishFlavor);
  try {
    await engine.init();
    const result = await analyzeGameWithEngine(parsed.game, engine, {
      analyzeOptions: config.analyzeOptions,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Server Stockfish analysis failed:", error);
    return NextResponse.json(serverAnalysisFailurePayload(error), {
      status: 500,
    });
  } finally {
    engine.dispose();
    slot.release();
  }
}
