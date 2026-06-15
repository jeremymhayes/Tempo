"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveGamePgn, toParsedGame } from "@/lib/api/games";
import { saveCurrentGame } from "@/lib/storage";
import { SAMPLE_PGN } from "@/lib/chess/sample-game";

export function PgnInput() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pgn, setPgn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function review(text: string) {
    setError(null);
    setSaving(true);

    try {
      const saved = await saveGamePgn(text);
      saveCurrentGame(toParsedGame(saved));
      router.push(`/games/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that PGN.");
    } finally {
      setSaving(false);
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
        placeholder={`Paste PGN here, e.g.\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...`}
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
        <Button onClick={() => review(pgn)} disabled={!pgn.trim() || saving}>
          {saving ? "Saving..." : "Save and Review"}
        </Button>
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
    </div>
  );
}
