import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeOptions } from "@/lib/engine/types";
import type { ParsedGame } from "@/types/chess";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import { ServerStockfishEngine } from "@/lib/engine/server-stockfish-engine";
import {
  analyzeGameWithEngine,
  getReviewPositions,
} from "@/lib/review/engine-analysis";
import { getServerAnalysisConfig } from "@/lib/review/server-analysis-config";
import { serverAnalysisFailurePayload } from "@/lib/review/server-analysis-error";
import {
  type ServerAnalysisSlot,
  tryAcquireServerAnalysisSlot,
} from "@/lib/review/server-analysis-limiter";
import { readAnalysisPgnBody } from "@/lib/review/server-analysis-request";
import {
  encodeServerAnalysisFrame,
  SERVER_ANALYSIS_STREAM_CONTENT_TYPE,
} from "@/lib/review/server-analysis-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function wantsStream(request: NextRequest): boolean {
  return request.headers
    .get("accept")
    ?.toLowerCase()
    .includes(SERVER_ANALYSIS_STREAM_CONTENT_TYPE) ?? false;
}

function streamServerAnalysis(
  game: ParsedGame,
  engine: ServerStockfishEngine,
  analyzeOptions: AnalyzeOptions,
  slot: ServerAnalysisSlot,
): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      engine.stop();
    } catch {
      // ignore cleanup races
    }
    engine.dispose();
    slot.release();
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (frame: Parameters<typeof encodeServerAnalysisFrame>[0]) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeServerAnalysisFrame(frame)));
        } catch {
          closed = true;
        }
      };

      try {
        await engine.init();

        write({
          type: "progress",
          progress: {
            current: 0,
            total: getReviewPositions(game).length,
            evalByPly: {},
            analysisByPly: {},
          },
        });

        const result = await analyzeGameWithEngine(game, engine, {
          analyzeOptions,
          onProgress: (progress) => {
            write({ type: "progress", progress });
          },
        });

        write({ type: "complete", result });
      } catch (error) {
        console.error("Server Stockfish analysis failed:", error);
        write({ type: "error", ...serverAnalysisFailurePayload(error) });
      } finally {
        cleanup();
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore client disconnect races
          }
        }
      }
    },
    cancel() {
      closed = true;
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": `${SERVER_ANALYSIS_STREAM_CONTENT_TYPE}; charset=utf-8`,
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
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

  const engine = new ServerStockfishEngine({
    flavor: config.stockfishFlavor,
    binaryPath: config.stockfishPath,
    threads: config.stockfishThreads,
    hashMb: config.stockfishHashMb,
  });
  if (wantsStream(request)) {
    return streamServerAnalysis(
      parsed.game,
      engine,
      config.analyzeOptions,
      slot,
    );
  }

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
