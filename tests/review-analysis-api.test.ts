import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { analyzeGameOnServer } from "@/lib/api/review-analysis";
import type {
  ReviewAnalysisProgress,
  ReviewAnalysisResult,
} from "@/lib/review/engine-analysis";
import type { ParsedGame } from "@/types/chess";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createGame(pgn: string): ParsedGame {
  return { pgn } as ParsedGame;
}

function createAnalysisResult(): ReviewAnalysisResult {
  return {
    current: 2,
    total: 2,
    evalByPly: {},
    analysisByPly: {},
    moves: [],
  };
}

function createProgress(current: number, total = 2): ReviewAnalysisProgress {
  return {
    current,
    total,
    evalByPly: {},
    analysisByPly: {},
  };
}

function createStreamResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${line}\n`));
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    },
  );
}

describe("review analysis API client", () => {
  it("shares an in-flight server request for the same PGN", async () => {
    const deferred = createDeferred<Response>();
    let fetchCount = 0;

    globalThis.fetch = async () => {
      fetchCount += 1;
      return deferred.promise;
    };

    const game = createGame("1. e4 *");
    const first = analyzeGameOnServer(game);
    const second = analyzeGameOnServer(game);

    assert.equal(fetchCount, 1);

    const result = createAnalysisResult();
    deferred.resolve(Response.json(result));

    assert.deepEqual(await first, result);
    assert.deepEqual(await second, result);
  });

  it("clears an in-flight server request after it settles", async () => {
    let fetchCount = 0;
    const result = createAnalysisResult();

    globalThis.fetch = async () => {
      fetchCount += 1;
      return Response.json(result);
    };

    const game = createGame("1. e4 *");

    assert.deepEqual(await analyzeGameOnServer(game), result);
    assert.deepEqual(await analyzeGameOnServer(game), result);
    assert.equal(fetchCount, 2);
  });

  it("reports streamed server progress before returning the final result", async () => {
    const result = createAnalysisResult();
    const progress: number[] = [];

    globalThis.fetch = async () =>
      createStreamResponse([
        JSON.stringify({ type: "progress", progress: createProgress(1) }),
        JSON.stringify({ type: "progress", progress: createProgress(2) }),
        JSON.stringify({ type: "complete", result }),
      ]);

    assert.deepEqual(
      await analyzeGameOnServer(createGame("1. d4 *"), {
        onProgress(update) {
          progress.push(update.current);
        },
      }),
      result,
    );
    assert.deepEqual(progress, [1, 2]);
  });
});
