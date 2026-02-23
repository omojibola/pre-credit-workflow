import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { MarketDataWebSocket } from "../lib/MarketDataWebSocket";
import { LatencyTracker } from "../lib/LatencyTracker";
import { HISTORY_MAX_PTS } from "../constants/instruments";
import type { MarketState, MarketAction, BatchItem, RawPrice } from "../types";

export interface LatencyStats { p50: number; p99: number; last: number }

// ── Reducer (pure — no side effects) ─────────────────────────────────────────
const INIT: MarketState = { prices: {}, history: {}, sessionHiLo: {}, tickCount: 0 };

function marketReducer(state: MarketState, action: MarketAction): MarketState {
  if (action.type !== "BATCH") return state;

  const prices     = { ...state.prices };
  const history    = { ...state.history };
  const sessionHiLo = { ...state.sessionHiLo };
  const t = new Date().toLocaleTimeString("en-GB", { hour12: false });

  for (const { id, data } of action.items) {
    const prev = prices[id];
    prices[id] = {
      bid:      data.bid,
      ask:      data.ask,
      mid:      data.mid,
      prevBid:  prev?.bid  ?? null,
      prevAsk:  prev?.ask  ?? null,
      prevMid:  prev?.mid  ?? null,
      bidFlash: prev ? (data.bid > prev.bid ? 1 : data.bid < prev.bid ? -1 : 0) : 0,
      askFlash: prev ? (data.ask > prev.ask ? 1 : data.ask < prev.ask ? -1 : 0) : 0,
      midFlash: prev ? (data.mid > prev.mid ? 1 : data.mid < prev.mid ? -1 : 0) : 0,
      ts: data.ts,
    };
    const hl = sessionHiLo[id] ?? { hi: data.mid, lo: data.mid, open: data.mid };
    sessionHiLo[id] = { open: hl.open, hi: Math.max(hl.hi, data.mid), lo: Math.min(hl.lo, data.mid) };
    const arr = history[id] ?? [];
    history[id] = [...arr.slice(-HISTORY_MAX_PTS), { t, mid: data.mid, bid: data.bid, ask: data.ask }];
  }

  return { prices, history, sessionHiLo, tickCount: state.tickCount + action.items.length };
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useMarketData() {
  const [mkt, dispatch] = useReducer(marketReducer, INIT);
  const [latency, setLatency] = useState<LatencyStats>({ p50: 0, p99: 0, last: 0 });

  const queueRef  = useRef<BatchItem[]>([]);
  const rafRef    = useRef<number | null>(null);
  const latRef    = useRef(new LatencyTracker(300));

  const handleMsg = useCallback((updates: Record<string, RawPrice>) => {
    const now = performance.now();
    for (const [id, data] of Object.entries(updates)) {
      latRef.current.record(now - data.ts);
      queueRef.current.push({ id, data });
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!queueRef.current.length) return;
        dispatch({ type: "BATCH", items: queueRef.current.splice(0) });
        const lt = latRef.current;
        setLatency({ p50: lt.p50(), p99: lt.p99(), last: lt.last() });
      });
    }
  }, []);

  useEffect(() => {
    const ws = new MarketDataWebSocket(handleMsg);
    ws.connect();
    return () => ws.disconnect();
  }, [handleMsg]);

  return { mkt, latency };
}
