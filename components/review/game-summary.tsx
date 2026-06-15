import type { ParsedGame } from "@/types/chess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RESULT_LABEL: Record<string, string> = {
  "1-0": "White wins",
  "0-1": "Black wins",
  "1/2-1/2": "Draw",
  "*": "Unfinished",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="truncate text-sm text-zinc-200">{value}</span>
    </div>
  );
}

export function GameSummary({ game }: { game: ParsedGame }) {
  const headers = game.headers;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game</CardTitle>
        <span className="font-mono text-xs text-zinc-500">{game.result}</span>
      </CardHeader>
      <CardContent className="py-2">
        <Row label="White" value={game.white} />
        <Row label="Black" value={game.black} />
        <Row label="Result" value={RESULT_LABEL[game.result] ?? game.result} />
        {game.datePlayed ? <Row label="Date" value={game.datePlayed} /> : null}
        {headers.Event ? <Row label="Event" value={headers.Event} /> : null}
        {headers.Site ? <Row label="Site" value={headers.Site} /> : null}
        <Row label="Moves" value={String(game.moves.length)} />
      </CardContent>
    </Card>
  );
}
