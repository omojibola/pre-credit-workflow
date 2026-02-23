import { DEALERS } from "../constants/dealers";
import type { IncomingQuote } from "../types";

type OnQuote   = (rfqId: string, quote: IncomingQuote | null, expired?: boolean) => void;
type OnDecline = (rfqId: string, dealerId: string) => void;

/**
 * Simulates multi-dealer RFQ mechanics.
 * All dealers receive the request simultaneously. Each responds independently
 * based on their configured response rate and latency distribution.
 * Mirrors TradeWeb / Bloomberg RFQ protocol.
 */
export class RFQEngine {
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly onQuote:   OnQuote,
    private readonly onDecline: OnDecline,
  ) {}

  sendRFQ(
    rfqId:     string,
    side:      "BUY" | "SELL",
    mid:       number,
    dealerIds: string[],
    ttlMs:     number,
  ): void {
    this.cancel();

    for (const did of dealerIds) {
      const dealer = DEALERS.find((d) => d.id === did);
      if (!dealer) continue;

      const responds = Math.random() < dealer.responseRate;
      const [lo, hi] = dealer.speedMs;
      const delay    = lo + Math.random() * (hi - lo);

      this.timers.push(
        setTimeout(() => {
          if (!responds) {
            this.onDecline(rfqId, did);
            return;
          }
          // Dealer applies axe bias + competitive spread tightening
          const axedMid = mid * dealer.axisBias;
          const hs      = Math.max(0.5, axedMid * 0.008 + Math.random() * 0.6);
          const comp    = 0.996 + Math.random() * 0.008;
          this.onQuote(rfqId, {
            dealerId:   did,
            bid:        +(axedMid * comp - hs).toFixed(2),
            ask:        +(axedMid * comp + hs).toFixed(2),
            mid:        +(axedMid * comp).toFixed(2),
            responseMs: Math.round(delay),
          });
        }, delay),
      );
    }

    // Auto-expire after TTL window
    this.timers.push(setTimeout(() => this.onQuote(rfqId, null, true), ttlMs));
  }

  cancel(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
