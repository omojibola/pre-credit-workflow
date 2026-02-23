import { INSTRUMENTS } from "../constants/instruments";
import type { RawPrice } from "../types";

interface InstrumentState {
  mid: number;
  vol: number;
  trend: number;
}

type MessageCallback = (updates: Record<string, RawPrice>) => void;

/**
 * Simulates a Solace/Kafka market data feed using an
 * Ornstein-Uhlenbeck mean-reverting price process.
 * In production this would be replaced by a real WS/SSE subscriber.
 */
export class MarketDataWebSocket {
  private cb: MessageCallback;
  private state: Record<string, InstrumentState> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(onMessage: MessageCallback) {
    this.cb = onMessage;
    for (const { id, baseMid } of INSTRUMENTS) {
      this.state[id] = {
        mid:   baseMid,
        vol:   baseMid * 0.009,
        trend: (Math.random() - 0.5) * 0.4,
      };
    }
  }

  connect(): void {
    this.running = true;
    this.scheduleNext();
  }

  disconnect(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      if (!this.running) return;
      this.tick();
      this.scheduleNext();
    }, 50 + Math.random() * 80);
  }

  private tick(): void {
    const now = performance.now();
    // Burst: update 8-22% of instruments per tick (realistic)
    const n = Math.floor(INSTRUMENTS.length * (0.08 + Math.random() * 0.14));
    const indices = new Set<number>();
    while (indices.size < n) {
      indices.add(Math.floor(Math.random() * INSTRUMENTS.length));
    }

    const updates: Record<string, RawPrice> = {};
    for (const i of indices) {
      const { id, baseMid } = INSTRUMENTS[i];
      const s = this.state[id];
      // O-U mean-reversion with stochastic drift
      s.trend = s.trend * 0.97 + (Math.random() - 0.5) * 0.08;
      s.mid   = Math.max(8, s.mid + (Math.random() - 0.5) * 2 * s.vol + (baseMid - s.mid) * 0.015 + s.trend);
      const hs = Math.max(0.3, s.mid * 0.007 + Math.random() * 0.4);
      updates[id] = {
        bid: +( s.mid - hs).toFixed(2),
        ask: +( s.mid + hs).toFixed(2),
        mid: +s.mid.toFixed(2),
        ts:  now,
      };
    }
    this.cb(updates);
  }
}
