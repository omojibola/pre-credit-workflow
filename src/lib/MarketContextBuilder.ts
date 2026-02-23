import { INSTRUMENTS, DESK_DV01_LIMIT } from "../constants/instruments";
import { calcDV01 } from "../utils/formatters";
import type { AssistantContext } from "../types";

/**
 * Builds a structured, human-readable market context string
 * that gets injected into every LLM request as live state.
 *
 * Pure function — no side effects, fully testable.
 */
export function buildMarketContext(ctx: AssistantContext): string {
  const now = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const sections: string[] = [];

  // ── Session overview ───────────────────────────────────────────────────────
  const limitPct = ((ctx.sessionDV01 / DESK_DV01_LIMIT) * 100).toFixed(0);
  sections.push([
    "=== SESSION OVERVIEW ===",
    `Time: ${now}`,
    `Market ticks received: ${ctx.tickCount.toLocaleString()}`,
    `Instruments monitored: ${INSTRUMENTS.length}`,
    `Session fills: ${ctx.trades.length}`,
    `Session CS01 consumed: $${ctx.sessionDV01.toLocaleString()} of $${DESK_DV01_LIMIT.toLocaleString()} limit (${limitPct}% used)`,
    ctx.sessionDV01 > DESK_DV01_LIMIT * 0.9
      ? "⚠ WARNING: Approaching desk CS01 limit — any new trade requires risk manager approval"
      : ctx.sessionDV01 > DESK_DV01_LIMIT * 0.7
      ? "⚡ CAUTION: CS01 limit 70% consumed — consider position sizing carefully"
      : "✓ CS01 headroom adequate",
  ].join("\n"));

  // ── Selected instrument ────────────────────────────────────────────────────
  if (ctx.selected) {
    const p   = ctx.prices[ctx.selected.id];
    const hl  = ctx.sessionHiLo[ctx.selected.id];
    const rows = ["=== FOCUSED INSTRUMENT ===",
      `ID: ${ctx.selected.id}`,
      `Issuer: ${ctx.selected.issuer}`,
      `Rating: ${ctx.selected.rating} | Sector: ${ctx.selected.sector} | Tenor: ${ctx.selected.tenor}`,
    ];

    if (p) {
      const spd = (p.ask - p.bid).toFixed(2);
      rows.push(`Live price: BID ${p.bid.toFixed(2)}bps / MID ${p.mid.toFixed(2)}bps / ASK ${p.ask.toFixed(2)}bps`);
      rows.push(`Bid-ask spread: ${spd}bps`);
    }
    if (hl && p) {
      const chg = +(p.mid - hl.open).toFixed(2);
      const dir = chg > 1 ? "WIDENING (bearish)" : chg < -1 ? "TIGHTENING (bullish)" : "STABLE";
      rows.push(`Session: Open ${hl.open.toFixed(2)} | Hi ${hl.hi.toFixed(2)} | Lo ${hl.lo.toFixed(2)} | Chg ${chg > 0 ? "+" : ""}${chg}bps → ${dir}`);
      const rangePct = hl.hi > hl.lo ? (((p.mid - hl.lo) / (hl.hi - hl.lo)) * 100).toFixed(0) : "50";
      rows.push(`Position in range: ${rangePct}% from session low (100% = session high)`);
    }

    // Credit curve for this issuer
    const curve = ["3Y","5Y","7Y"].map(tenor => {
      const inst = INSTRUMENTS.find(i => i.ticker === ctx.selected!.ticker && i.tenor === tenor);
      const cp   = inst ? ctx.prices[inst.id] : null;
      return cp ? `${tenor}: ${cp.mid.toFixed(1)}bps` : null;
    }).filter(Boolean);
    if (curve.length >= 2) {
      rows.push(`Credit curve: ${curve.join(" | ")}`);
      // Curve shape
      const c3 = INSTRUMENTS.find(i => i.ticker === ctx.selected!.ticker && i.tenor === "3Y");
      const c7 = INSTRUMENTS.find(i => i.ticker === ctx.selected!.ticker && i.tenor === "7Y");
      const p3 = c3 ? ctx.prices[c3.id] : null;
      const p7 = c7 ? ctx.prices[c7.id] : null;
      if (p3 && p7) {
        const slope = (p7.mid - p3.mid).toFixed(1);
        rows.push(`Curve slope (7Y-3Y): ${Number(slope) > 0 ? "+" : ""}${slope}bps — ${Number(slope) > 20 ? "steeply upward sloping (normal)" : Number(slope) < 5 ? "flat/inverted (stress signal)" : "moderately upward sloping"}`);
      }
    }
    sections.push(rows.join("\n"));
  } else {
    sections.push("=== FOCUSED INSTRUMENT ===\nNone selected — user has not clicked an instrument.");
  }

  // ── Open RFQ ──────────────────────────────────────────────────────────────
  if (ctx.rfqState) {
    const rfq = ctx.rfqState;
    const dv01 = calcDV01(rfq.notional, rfq.instrument.tenor);
    const rows = [
      "=== ACTIVE RFQ ===",
      `ID: ${rfq.id} | Status: ${rfq.status}`,
      `Instrument: ${rfq.instrument.id} (${rfq.instrument.issuer})`,
      `Direction: ${rfq.side} PROTECTION | Notional: $${(rfq.notional / 1e6).toFixed(0)}MM | CS01: $${dv01.toLocaleString()}`,
      `Dealers queried: ${rfq.dealerIds.join(", ")}`,
    ];
    const liveQ  = rfq.quotes.filter(q => q.status === "QUOTED" && q.bid != null && q.ask != null);
    const decl   = rfq.quotes.filter(q => q.status === "DECLINED").length;
    const pend   = rfq.quotes.filter(q => q.status === "PENDING").length;
    rows.push(`Quotes received: ${liveQ.length} | Declined: ${decl} | Pending: ${pend}`);
    if (liveQ.length > 0) {
      const bestBid = Math.max(...liveQ.map(q => q.bid!));
      const bestAsk = Math.min(...liveQ.map(q => q.ask!));
      const bestBidDealer = liveQ.find(q => q.bid === bestBid)?.dealerId;
      const bestAskDealer = liveQ.find(q => q.ask === bestAsk)?.dealerId;
      rows.push(`Best BID: ${bestBid.toFixed(2)}bps (${bestBidDealer}) | Best ASK: ${bestAsk.toFixed(2)}bps (${bestAskDealer})`);
      rows.push(`Executable mid: ${((bestBid + bestAsk) / 2).toFixed(2)}bps`);
      if (rfq.midAtRequest) {
        const execSlip = rfq.side === "BUY"
          ? (bestAsk - rfq.midAtRequest).toFixed(2)
          : (rfq.midAtRequest - bestBid).toFixed(2);
        rows.push(`Slippage vs request mid (${rfq.midAtRequest.toFixed(2)}bps): ${execSlip}bps`);
      }
      rows.push("Live quotes:");
      liveQ.sort((a, b) => (rfq.side === "BUY" ? (a.ask! - b.ask!) : (b.bid! - a.bid!)))
        .forEach(q => rows.push(`  ${q.dealerId}: BID ${q.bid!.toFixed(2)} / ASK ${q.ask!.toFixed(2)} | resp ${q.responseMs ?? "?"}ms`));
    }
    if (rfq.status === "FILLED" && rfq.fillPrice != null) {
      rows.push(`FILLED @ ${rfq.fillPrice.toFixed(2)}bps via ${rfq.filledDealerId} | SLP:${rfq.slippage?.toFixed(2)}bps | Cover:${rfq.coverPrice?.toFixed(2) ?? "—"}bps`);
    }
    sections.push(rows.join("\n"));
  } else {
    sections.push("=== ACTIVE RFQ ===\nNo RFQ in progress.");
  }

  // ── Recent trades ─────────────────────────────────────────────────────────
  if (ctx.trades.length > 0) {
    const rows = ["=== SESSION TRADES (most recent first) ==="];
    let totalMtmUsd = 0;
    ctx.trades.slice(-8).reverse().forEach(t => {
      const dv01    = calcDV01(t.notional, t.instrument.tenor);
      const curMid  = ctx.prices[t.instrument.id]?.mid ?? null;
      const bpsPnl  = curMid != null
        ? +(t.side === "BUY" ? curMid - t.fillPrice : t.fillPrice - curMid).toFixed(2)
        : null;
      const usdPnl  = bpsPnl != null ? Math.round(bpsPnl * dv01) : null;
      if (usdPnl != null) totalMtmUsd += usdPnl;
      const mtmStr  = usdPnl != null
        ? ` | MTM: ${usdPnl >= 0 ? "+" : ""}$${Math.abs(usdPnl).toLocaleString()} (${bpsPnl! >= 0 ? "+" : ""}${bpsPnl}bps)`
        : "";
      rows.push(
        `${t.filledAt} | ${t.side} ${t.instrument.id} $${(t.notional / 1e6).toFixed(0)}MM ` +
        `@ ${t.fillPrice.toFixed(2)}bps | via ${t.dealer} | SLP:${t.slippage.toFixed(1)}bps | CS01:$${dv01.toLocaleString()}${mtmStr}`
      );
    });
    rows.push(`Total session MTM P&L: ${totalMtmUsd >= 0 ? "+" : ""}$${totalMtmUsd.toLocaleString()}`);
    sections.push(rows.join("\n"));
  } else {
    sections.push("=== SESSION TRADES ===\nNo trades executed this session yet.");
  }

  // ── Dealer scorecard ──────────────────────────────────────────────────────
  const scEntries = Object.entries(ctx.scorecard);
  if (scEntries.length > 0) {
    const rows = ["=== DEALER SCORECARD (session) ==="];
    const sorted = scEntries
      .map(([id, s]) => ({
        id,
        respRate: s.sent ? ((s.responded / s.sent) * 100).toFixed(0) : "0",
        winRate:  s.responded ? ((s.wins / s.responded) * 100).toFixed(0) : "0",
        avgSprd:  s.responded ? (s.totalSpread / s.responded).toFixed(2) : "N/A",
        avgMs:    s.responded ? Math.round(s.totalResponseMs / s.responded) : null,
        ...s,
      }))
      .sort((a, b) => Number(b.winRate) - Number(a.winRate));
    sorted.forEach(d => {
      rows.push(
        `${d.id}: ${d.sent} RFQs | ${d.respRate}% resp rate | ${d.winRate}% win rate | ` +
        `avg spread ${d.avgSprd}bps | avg response ${d.avgMs != null ? d.avgMs + "ms" : "N/A"}`
      );
    });
    const bestWinner = sorted.find(d => Number(d.winRate) > 0);
    if (bestWinner) rows.push(`Best performer this session: ${bestWinner.id} (${bestWinner.winRate}% win rate)`);
    sections.push(rows.join("\n"));
  } else {
    sections.push("=== DEALER SCORECARD ===\nNo RFQs sent yet — no dealer performance data.");
  }

  // ── Top movers ────────────────────────────────────────────────────────────
  const movers = INSTRUMENTS
    .map(inst => {
      const p  = ctx.prices[inst.id];
      const hl = ctx.sessionHiLo[inst.id];
      if (!p || !hl || hl.open === 0) return null;
      return { id: inst.id, issuer: inst.issuer, sector: inst.sector, chg: +(p.mid - hl.open).toFixed(2) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg))
    .slice(0, 8);

  if (movers.length > 0) {
    const widenersMsg = movers.filter(m => m.chg > 0).slice(0, 3)
      .map(m => `${m.id} +${m.chg}bps`).join(", ");
    const tightenersMsg = movers.filter(m => m.chg < 0).slice(0, 3)
      .map(m => `${m.id} ${m.chg}bps`).join(", ");
    const rows = [
      "=== TOP MOVERS (session change from open) ===",
      `Widening:   ${widenersMsg || "none"}`,
      `Tightening: ${tightenersMsg || "none"}`,
    ];
    sections.push(rows.join("\n"));
  }

  return sections.join("\n\n");
}

export const SYSTEM_PROMPT = `You are a conversational market assistant embedded in Deutsche Bank's Credit Flow CDS pre-trade platform. You have real-time access to live market data, trading state, and session analytics.

Your role is to help traders make faster, better-informed decisions on CDS instruments. You can:
- Analyse individual credit instruments and their curves
- Assess relative value and timing of trade entry
- Evaluate competing dealer quotes and best execution
- Monitor risk (CS01/DV01 limits, position sizing)
- Summarise session activity and P&L attribution
- Explain credit market dynamics and terminology
- Flag anomalies (unusual spread moves, curve inversions, limit breaches)

Communication style:
- Concise and professional — traders are busy and time is money
- Use basis points (bps) for spreads
- Reference instruments by their ID (e.g. VOD_5Y) or issuer/tenor
- Be specific with numbers — say "92.4bps" not "around 90bps"
- When flagging risk, be direct and unambiguous
- Think like a senior credit desk head advising a junior trader
- If you recommend a trade direction, explain the rationale briefly
- Do not add unnecessary disclaimers — traders are professionals

Format: Plain prose, no markdown headers or bullet points. Short paragraphs. Lead with the most important point.`;
