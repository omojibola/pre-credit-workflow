import { useState, useEffect, useRef, useCallback } from 'react';
import { RFQEngine } from '../lib/RFQEngine';
import { DEALERS } from '../constants/dealers';
import { DESK_DV01_LIMIT, TTL_MS } from '../constants/instruments';
import { calcDV01, nowTs, f2 } from '../utils/formatters';
import type {
  Instrument,
  RFQState,
  Trade,
  Scorecard,
  IncomingQuote,
  TradeSide,
} from '../types';

interface UseRFQOptions {
  pushAudit: (type: string, msg: string) => void;
  onFill: (trade: Trade) => void;
}

export function useRFQ({ pushAudit, onFill }: UseRFQOptions) {
  const [rfqState, setRfq] = useState<RFQState | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard>({});

  const rfqRef = useRef<RFQState | null>(null);
  const engineRef = useRef<RFQEngine | null>(null);

  useEffect(() => {
    rfqRef.current = rfqState;
  }, [rfqState]);

  // ── Quote received ──────────────────────────────────────────────────────────
  const handleQuoteReceived = useCallback(
    (rfqId: string, quote: IncomingQuote | null, expired = false) => {
      setRfq((prev) => {
        if (!prev || prev.id !== rfqId) return prev;

        if (expired) {
          pushAudit('QUOTE_EXPIRED', `${rfqId} · 30s window closed`);
          return {
            ...prev,
            status: 'EXPIRED' as const,
            quotes: prev.quotes.map((q) =>
              q.status === 'PENDING' ? { ...q, status: 'EXPIRED' as const } : q,
            ),
          };
        }

        if (!quote) return prev;
        const { dealerId, bid, ask, mid, responseMs } = quote;
        pushAudit(
          'QUOTE_RECEIVED',
          `${rfqId} · ${dealerId} · BID:${f2(bid)} ASK:${f2(ask)} (${responseMs}ms)`,
        );

        setScorecard((sc) => {
          const ex = sc[dealerId] ?? {
            sent: 0,
            responded: 0,
            wins: 0,
            totalSpread: 0,
            totalResponseMs: 0,
          };
          return {
            ...sc,
            [dealerId]: {
              ...ex,
              responded: ex.responded + 1,
              totalSpread: ex.totalSpread + (ask - bid),
              totalResponseMs: ex.totalResponseMs + (responseMs ?? 0),
            },
          };
        });

        return {
          ...prev,
          status: 'QUOTED' as const,
          quotes: prev.quotes.map((q) =>
            q.dealerId === dealerId
              ? { ...q, bid, ask, mid, status: 'QUOTED' as const, responseMs }
              : q,
          ),
        };
      });
    },
    [pushAudit],
  );

  // ── Dealer decline ──────────────────────────────────────────────────────────
  const handleDealerDecline = useCallback(
    (rfqId: string, dealerId: string) => {
      pushAudit('DEALER_DECLINED', `${rfqId} · ${dealerId} · No quote`);
      setRfq((prev) => {
        if (!prev || prev.id !== rfqId) return prev;
        return {
          ...prev,
          quotes: prev.quotes.map((q) =>
            q.dealerId === dealerId ? { ...q, status: 'DECLINED' as const } : q,
          ),
        };
      });
    },
    [pushAudit],
  );

  // ── Engine lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current = new RFQEngine(handleQuoteReceived, handleDealerDecline);
    return () => engineRef.current?.cancel();
  }, [handleQuoteReceived, handleDealerDecline]);

  // ── Send RFQ ────────────────────────────────────────────────────────────────
  const sendRFQ = useCallback(
    (
      instrument: Instrument,
      side: TradeSide,
      notional: number,
      mid: number | null,
      dealerCount: number,
    ) => {
      if (!mid) return;
      engineRef.current?.cancel();

      const rfqId = `RFQ-${Date.now().toString(36).toUpperCase()}`;
      const shuffled = [...DEALERS]
        .sort(() => Math.random() - 0.5)
        .slice(0, dealerCount);
      const dealerIds = shuffled.map((d) => d.id);

      const newRfq: RFQState = {
        id: rfqId,
        instrument,
        side,
        notional,
        midAtRequest: mid,
        dealerIds,
        status: 'PENDING',
        sentAt: Date.now(),
        quotes: shuffled.map((d) => ({
          dealerId: d.id,
          bid: null,
          ask: null,
          mid: null,
          status: 'PENDING',
        })),
        fillPrice: null,
        filledDealerId: null,
        slippage: null,
        coverPrice: null,
      };
      setRfq(newRfq);
      pushAudit(
        'RFQ_SENT',
        `${rfqId} · ${instrument.id} · ${side} $${(notional / 1e6).toFixed(0)}MM → [${dealerIds.join(',')}]`,
      );

      setScorecard((sc) => {
        const next = { ...sc };
        dealerIds.forEach((did) => {
          const ex = next[did] ?? {
            sent: 0,
            responded: 0,
            wins: 0,
            totalSpread: 0,
            totalResponseMs: 0,
          };
          next[did] = { ...ex, sent: ex.sent + 1 };
        });
        return next;
      });

      engineRef.current?.sendRFQ(rfqId, mid, dealerIds, TTL_MS);
    },
    [pushAudit],
  );

  // ── Accept quote ────────────────────────────────────────────────────────────
  const acceptQuote = useCallback(
    (dealerId: string) => {
      const rfq = rfqRef.current;
      if (!rfq || rfq.status !== 'QUOTED') return;
      engineRef.current?.cancel();

      const wq = rfq.quotes.find((q) => q.dealerId === dealerId);
      if (!wq || wq.bid == null || wq.ask == null) return;

      const fillPrice = rfq.side === 'BUY' ? wq.ask : wq.bid;
      const slippage = +Math.abs(
        fillPrice - (rfq.midAtRequest ?? fillPrice),
      ).toFixed(2);
      const liveOthers = rfq.quotes.filter(
        (q) => q.status === 'QUOTED' && q.dealerId !== dealerId,
      );
      const coverPrice = liveOthers.length
        ? rfq.side === 'BUY'
          ? Math.min(...liveOthers.map((q) => q.ask!))
          : Math.max(...liveOthers.map((q) => q.bid!))
        : null;
      const dv01 = calcDV01(rfq.notional, rfq.instrument.tenor);
      const filledAt = nowTs();

      pushAudit(
        'TRADE_FILLED',
        `${rfq.id} · DEAL→${dealerId} @ ${f2(fillPrice)}bps · SLP:${f2(slippage)} · CVR:${f2(coverPrice)}`,
      );
      pushAudit(
        'BEST_EXECUTION',
        `${rfq.id} · CS01:$${dv01.toLocaleString()} · MiFID II logged`,
      );
      liveOthers.forEach((q) =>
        pushAudit(
          'PASS_SENT',
          `${rfq.id} · PASS→${q.dealerId} · cover:${f2(rfq.side === 'BUY' ? q.ask : q.bid)}bps`,
        ),
      );

      setScorecard((sc) => {
        const ex = sc[dealerId] ?? {
          sent: 0,
          responded: 0,
          wins: 0,
          totalSpread: 0,
          totalResponseMs: 0,
        };
        return { ...sc, [dealerId]: { ...ex, wins: ex.wins + 1 } };
      });

      setRfq((prev) =>
        prev
          ? {
              ...prev,
              status: 'FILLED',
              fillPrice,
              filledDealerId: dealerId,
              slippage,
              coverPrice,
              filledAt,
              quotes: prev.quotes.map((q) =>
                q.dealerId === dealerId
                  ? { ...q, status: 'FILLED' as const }
                  : q.status === 'QUOTED'
                    ? { ...q, status: 'PASSED' as const }
                    : q,
              ),
            }
          : null,
      );

      onFill({
        id: rfq.id,
        instrument: rfq.instrument,
        side: rfq.side,
        notional: rfq.notional,
        fillPrice,
        midAtRequest: rfq.midAtRequest ?? fillPrice,
        slippage,
        filledAt,
        dealer: dealerId,
        coverPrice,
      });
    },
    [pushAudit, onFill],
  );

  const newRFQ = useCallback(() => setRfq(null), []);

  const sessionDV01 = 0; // Provided externally from trades
  void sessionDV01;
  void DESK_DV01_LIMIT;

  return { rfqState, scorecard, sendRFQ, acceptQuote, newRFQ };
}
