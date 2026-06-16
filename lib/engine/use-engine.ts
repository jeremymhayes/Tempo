"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisEngine, AnalysisUpdate, EngineStatus } from "./types";
import { createEngine } from "./index";
import { getEngineDescriptor } from "./registry";
import type { AnalysisSettings } from "./settings";

export interface EngineHookState {
  status: EngineStatus;
  error: string | null;
  update: AnalysisUpdate | null;
  analyzeNow: () => void;
}

/**
 * Owns an engine worker and streams analysis for the given FEN.
 *
 * - Recreates the worker when the engine id changes.
 * - Auto-analyzes (debounced) when the position or settings change, if enabled.
 * - Discards updates whose FEN no longer matches the requested position.
 */
export function useEngineAnalysis(params: {
  fen: string;
  enabled: boolean;
  settings: AnalysisSettings;
}): EngineHookState {
  const { fen, enabled, settings } = params;

  const [status, setStatus] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<AnalysisUpdate | null>(null);
  const [readyTick, setReadyTick] = useState(0);

  const engineRef = useRef<AnalysisEngine | null>(null);
  const readyRef = useRef(false);
  const fenRef = useRef(fen);
  const settingsRef = useRef(settings);
  const lastKeyRef = useRef("");

  useEffect(() => {
    fenRef.current = fen;
    settingsRef.current = settings;
  }, [fen, settings]);

  // (Re)create the engine when the selected engine changes.
  useEffect(() => {
    const descriptor = getEngineDescriptor(settings.engineId);
    readyRef.current = false;
    lastKeyRef.current = "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpdate(null);

    if (!descriptor?.available) {
      setStatus("error");
      setError(descriptor?.unavailableReason ?? "Engine unavailable.");
      return;
    }

    setStatus("loading");
    setError(null);

    let engine: AnalysisEngine;
    try {
      engine = createEngine(settings.engineId);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to create engine.");
      return;
    }
    engineRef.current = engine;

    let cancelled = false;
    engine
      .init()
      .then(() => {
        if (cancelled) return;
        readyRef.current = true;
        setStatus("ready");
        setReadyTick((t) => t + 1);
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Engine failed to load.");
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, [settings.engineId]);

  const analyzeNow = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !readyRef.current) return;
    const s = settingsRef.current;
    const targetFen = fenRef.current;

    setStatus("analyzing");
    engine.analyze(
      targetFen,
      {
        depth: s.mode === "depth" ? s.depth : undefined,
        movetime: s.mode === "time" ? s.movetime : undefined,
        multiPV: s.multiPV,
        skill: s.skill,
      },
      (u) => {
        if (u.fen !== fenRef.current) return; // stale position
        setUpdate(u);
        if (u.done) setStatus("ready");
      },
    );
  }, []);

  // Auto-analyze on position / settings change (deduped so it can't loop).
  useEffect(() => {
    if (!enabled || !settings.autoAnalyze || !readyRef.current) return;

    const key = [
      fen,
      settings.mode,
      settings.depth,
      settings.movetime,
      settings.multiPV,
      settings.skill,
    ].join("|");
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    const timer = setTimeout(analyzeNow, 200);
    return () => clearTimeout(timer);
  }, [
    fen,
    enabled,
    settings.autoAnalyze,
    settings.mode,
    settings.depth,
    settings.movetime,
    settings.multiPV,
    settings.skill,
    readyTick,
    analyzeNow,
  ]);

  return { status, error, update, analyzeNow };
}
