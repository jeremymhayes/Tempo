import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLichessExportUrl,
  parseChessComGameUrl,
  parseLichessGameId,
  resolveGameSource,
} from "@/lib/import/game-source";
import { SAMPLE_PGN } from "@/lib/chess/sample-game";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, contentType = "application/x-chess-pgn") {
  return new Response(body, {
    headers: { "content-type": contentType },
  });
}

test("resolveGameSource keeps pasted PGN local", async () => {
  let calls = 0;
  const resolved = await resolveGameSource(SAMPLE_PGN, {
    fetch: async () => {
      calls += 1;
      throw new Error("raw PGN should not be fetched");
    },
  });

  assert.equal(resolved.sourceType, "pgn");
  assert.equal(resolved.provider, "pgn");
  assert.equal(resolved.pgn, SAMPLE_PGN.trim());
  assert.equal(calls, 0);
});

test("resolveGameSource fetches Lichess export PGN from a game URL", async () => {
  const calls: string[] = [];
  const resolved = await resolveGameSource("https://lichess.org/abcdefgh/black#12", {
    fetch: async (input) => {
      const url = String(input);
      calls.push(url);
      assert.equal(
        url,
        "https://lichess.org/game/export/abcdefgh?moves=true&tags=true&clocks=false&evals=false&opening=true&literate=false",
      );
      return textResponse(SAMPLE_PGN);
    },
  });

  assert.equal(resolved.sourceType, "url");
  assert.equal(resolved.provider, "lichess");
  assert.equal(resolved.pgn, SAMPLE_PGN.trim());
  assert.deepEqual(calls, [buildLichessExportUrl("abcdefgh")]);
});

test("resolveGameSource resolves a Chess.com live game URL through the public archive", async () => {
  const calls: string[] = [];
  const uuid = "34ae8c32-8cc0-11e7-8000-000000000000";
  const resolved = await resolveGameSource(
    "https://www.chess.com/game/live/2485075845",
    {
      fetch: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url === "https://www.chess.com/callback/live/game/2485075845") {
          return jsonResponse({
            game: {
              uuid,
              pgnHeaders: {
                Date: "2017.12.12",
                White: "ErnestoGuevaraLynch",
                Black: "chesstatour",
              },
            },
          });
        }
        if (
          url ===
          "https://api.chess.com/pub/player/ErnestoGuevaraLynch/games/2017/12"
        ) {
          return jsonResponse({
            games: [
              { uuid: "other-game", pgn: "[Event \"Other\"]\n\n1. e4 e5 1/2-1/2" },
              { uuid, pgn: SAMPLE_PGN },
            ],
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
    },
  );

  assert.equal(resolved.sourceType, "url");
  assert.equal(resolved.provider, "chess.com");
  assert.equal(resolved.pgn, SAMPLE_PGN.trim());
  assert.deepEqual(calls, [
    "https://www.chess.com/callback/live/game/2485075845",
    "https://api.chess.com/pub/player/ErnestoGuevaraLynch/games/2017/12",
  ]);
});

test("resolveGameSource extracts PGN from a Chess.com computer-game analysis page", async () => {
  const pgn = `[Event "Play vs Bot"]
[Site "Chess.com"]
[White "AspectOTD"]
[Black "Janjay-BOT"]
[Result "1-0"]

1. e4 e5 1-0`;
  const calls: string[] = [];

  const resolved = await resolveGameSource(
    "https://www.chess.com/analysis/game/computer/1570491206/review?move=0",
    {
      fetch: async (input) => {
        const url = String(input);
        calls.push(url);
        assert.equal(
          url,
          "https://www.chess.com/analysis/game/computer/1570491206?move=0",
        );
        return textResponse(
          `<script>window.chesscom.analysis = { pgn: '${pgn.replace(/\n/g, "\\n")}' };</script>`,
          "text/html",
        );
      },
    },
  );

  assert.equal(resolved.sourceType, "url");
  assert.equal(resolved.provider, "chess.com");
  assert.equal(resolved.normalizedUrl, calls[0]);
  assert.equal(resolved.pgn, pgn);
});

test("provider URL parsers reject unsupported URLs", () => {
  assert.equal(parseLichessGameId(new URL("https://lichess.org/abcdefgh")), "abcdefgh");
  assert.deepEqual(parseChessComGameUrl(new URL("https://www.chess.com/game/live/12345")), {
    gameId: "12345",
    kind: "live",
  });
  assert.deepEqual(
    parseChessComGameUrl(
      new URL("https://www.chess.com/analysis/game/computer/1570491206/review"),
    ),
    {
      gameId: "1570491206",
      kind: "computer",
    },
  );
  assert.equal(parseLichessGameId(new URL("https://example.com/abcdefgh")), null);
  assert.equal(parseChessComGameUrl(new URL("https://www.chess.com/news")), null);
});
