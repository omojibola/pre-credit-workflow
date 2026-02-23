import { DEALERS } from "../../constants/dealers";
import { labelStyle } from "../../constants/styles";
import { f2 } from "../../utils/formatters";
import type { DealerQuote, TradeSide } from "../../types";

interface Props {
  quotes: DealerQuote[];
  side:   TradeSide;
}

export function QuoteBars({ quotes, side }: Props) {
  const live = quotes.filter((q) => q.status === "QUOTED" && q.bid != null && q.ask != null);
  if (live.length < 2) return null;

  const allBids = live.map((q) => q.bid!);
  const allAsks = live.map((q) => q.ask!);
  const minVal  = Math.min(...allBids) * 0.998;
  const maxVal  = Math.max(...allAsks) * 1.002;
  const range   = maxVal - minVal || 1;
  const bestBid = Math.max(...allBids);
  const bestAsk = Math.min(...allAsks);

  return (
    <div style={{ background:"#0c0d0f", border:"1px solid #141418", borderRadius:3, padding:"8px", marginBottom:10 }}>
      <div style={{ ...labelStyle, marginBottom:7 }}>QUOTE SPREAD VISUALISATION</div>
      {live.map((q) => {
        const d       = DEALERS.find((x) => x.id === q.dealerId);
        const bidPct  = ((q.bid! - minVal) / range) * 100;
        const askPct  = ((q.ask! - minVal) / range) * 100;
        const execPct = side === "BUY" ? askPct : bidPct;
        return (
          <div key={q.dealerId} style={{ marginBottom:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span style={{ fontFamily:"monospace", fontSize:9, color: d?.color ?? "#666" }}>{q.dealerId}</span>
              <span style={{ fontFamily:"monospace", fontSize:9 }}>
                <span style={{ color: q.bid === bestBid ? "#4ade80" : "#3a4050" }}>{f2(q.bid)}</span>
                <span style={{ color:"#1e2530" }}> / </span>
                <span style={{ color: q.ask === bestAsk ? "#f87171" : "#3a4050" }}>{f2(q.ask)}</span>
              </span>
            </div>
            <div style={{ height:5, background:"#0e0f12", borderRadius:3, position:"relative" }}>
              <div style={{ position:"absolute", top:0, bottom:0, left:`${bidPct}%`,
                width:`${Math.max(0.5, askPct - bidPct)}%`, background:`${d?.color ?? "#666"}22`, borderRadius:3 }}/>
              <div style={{ position:"absolute", top:-1, left:`calc(${bidPct}% - 2px)`, width:4, height:7,
                background:"#4ade80", borderRadius:1, opacity: q.bid === bestBid ? 0.9 : 0.25 }}/>
              <div style={{ position:"absolute", top:-1, left:`calc(${askPct}% - 2px)`, width:4, height:7,
                background:"#f87171", borderRadius:1, opacity: q.ask === bestAsk ? 0.9 : 0.25 }}/>
              <div style={{ position:"absolute", top:-2, left:`calc(${execPct}% - 3px)`, width:6, height:9,
                background: d?.color ?? "#666", borderRadius:1, opacity:0.8, boxShadow:`0 0 4px ${d?.color ?? "#666"}` }}/>
            </div>
          </div>
        );
      })}
      <div style={{ display:"flex", gap:12, marginTop:4, fontSize:8, fontFamily:"monospace" }}>
        <span style={{ color:"#4ade80" }}>■ BEST BID</span>
        <span style={{ color:"#f87171" }}>■ BEST ASK</span>
        <span style={{ color:"#666" }}>■ EXEC PT</span>
      </div>
    </div>
  );
}
