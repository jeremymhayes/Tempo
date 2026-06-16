"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importGameSource, saveGamePgn, toParsedGame } from "@/lib/api/games";
import { parsePgnForReview } from "@/lib/chess/pgn-review";
import { saveCurrentGame } from "@/lib/storage";
import { SAMPLE_PGN } from "@/lib/chess/sample-game";

export function PgnInput({ canSave }: { canSave: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"review" | "save" | null>(null);

  async function resolveInputPgn(text: string) {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return (await importGameSource(trimmed)).pgn;
    }
    return text;
  }

  async function reviewAsGuest(text: string) {
    setError(null);
    setBusyAction("review");

    try {
      const pgn = await resolveInputPgn(text);
      const parsed = parsePgnForReview(pgn);
      if (!parsed.ok) {
        setError(parsed.error);
        setBusyAction(null);
        return;
      }

      saveCurrentGame(parsed.game);
      router.push("/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import that game.");
      setBusyAction(null);
    }
  }

  async function saveAndReview(text: string) {
    if (!canSave) return;
    setError(null);
    setBusyAction("save");

    try {
      const pgn = await resolveInputPgn(text);
      const saved = await saveGamePgn(pgn);
      saveCurrentGame(toParsedGame(saved));
      router.push(`/games/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that PGN.");
    } finally {
      setBusyAction(null);
    }
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setPgn(text);
      setError(null);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
    // Allow re-selecting the same file.
    e.target.value = "";
  }

  function loadSample() {
    setPgn(SAMPLE_PGN);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder={`Paste PGN or a Chess.com / Lichess game link, e.g.\n\nhttps://lichess.org/abcdefgh\nhttps://www.chess.com/game/live/123456789\n\n1. e4 e5 2. Nf3 Nc6 ...`}
        rows={12}
        spellCheck={false}
      />

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => void reviewAsGuest(pgn)}
          disabled={!pgn.trim() || busyAction !== null}
        >
          {busyAction === "review" ? "Importing..." : "Review Game"}
        </Button>
        {canSave ? (
          <Button
            variant="secondary"
            onClick={() => void saveAndReview(pgn)}
            disabled={!pgn.trim() || busyAction !== null}
          >
            {busyAction === "save" ? "Importing..." : "Save to Account"}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" />
          Upload .pgn
        </Button>
        <Button variant="ghost" onClick={loadSample}>
          Try Sample Game
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pgn,.txt,text/plain"
          className="hidden"
          onChange={onUpload}
        />
      </div>
      {!canSave ? (
        <p className="text-xs text-zinc-500">
          Paste PGN directly, upload a .pgn file, or paste a public Chess.com /
          Lichess game link. Guest reviews stay in this browser session.
        </p>
      ) : null}
    </div>
  );
}
