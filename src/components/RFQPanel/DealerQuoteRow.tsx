import { DEALERS } from "../../constants/dealers";
import { mkBtn } from "../../constants/styles";
import { f2 } from "../../utils/formatters";
import type { DealerQuote, QuoteStatus, TradeSide, RFQStatus } from "../../types";

const STATUS_CFG: Record<QuoteStatus, { label: string; color: string }> = {
  PENDING:  { label:"PENDING…", color:"#fbbf24" },
  QUOTED:   { label:"QUOTED",   color:"#4ade80" },
  DECLINED: { label:"N/Q",      color:"#2e3545" },
  FILLED:   { label:"FILLED",   color:"#818cf8" },
  PASSED:   { label:"PASS",     color:"#2e3545" },
  EXPIRED:  { label:"EXPIRED",  color:"#f97316" },
};

interface Props {
  entry:      DealerQuote;
  side:       TradeSide;
  isBestBid:  boolean;
  isBestAsk:  boolean;
  onAccept:   (dealerId: string) => void;
  rfqStatus:  RFQStatus;
  countdown:  number;
}

export function DealerQuoteRow({ entry, side, isBestBid, isBestAsk, onAccept, rfqStatus, countdown }: Props) {
  const dealer    = DEALERS.find((d) => d.id === entry.dealerId);
  const sc        = STATUS_CFG[entry.status] ?? STATUS_CFG.PENDING;
  const isBest    = side === "BUY" ? isBestAsk : isBestBid;
  const canAccept = entry.status === "QUOTED" && rfqStatus === "QUOTED" && countdown > 0;

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"72px 64px 64px 64px 72px 52px",
      alignItems:"center", padding:"0 10px", height:36, borderBottom:"1px solid #0e0e0e",
      background: isBest && entry.status === "QUOTED" ? "rgba(74,222,128,.03)" : "transparent",
      borderLeft: isBest && entry.status === "QUOTED" ? `2px solid ${dealer?.color ?? "#4ade80"}` : "2px solid transparent",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <div style={{ width:3, height:3, borderRadius:"50%", background: dealer?.color ?? "#444", flexShrink:0 }}/>
        <span style={{ fontFamily:"monospace", fontSize:11, color: dealer?.color ?? "#666", fontWeight:600 }}>{entry.dealerId}</span>
        {isBest && entry.status === "QUOTED" && <span style={{ fontSize:7, color:"#4ade80" }}>★</span>}
      </div>
      <div style={{ textAlign:"right", fontFamily:"monospace", fontSize:11,
        color: entry.status === "QUOTED" ? (isBestBid ? "#4ade80" : "#4a5468") : "#1e2530" }}>
        {entry.bid != null ? f2(entry.bid) : "—"}
      </div>
      <div style={{ textAlign:"right", fontFamily:"monospace", fontSize:11, color: entry.status === "QUOTED" ? "#5a6478" : "#1e2530" }}>
        {entry.mid != null ? f2(entry.mid) : "—"}
      </div>
      <div style={{ textAlign:"right", fontFamily:"monospace", fontSize:11,
        color: entry.status === "QUOTED" ? (isBestAsk ? "#f87171" : "#4a5468") : "#1e2530" }}>
        {entry.ask != null ? f2(entry.ask) : "—"}
      </div>
      <div style={{ textAlign:"center" }}>
        <span style={{ fontSize:8, fontWeight:700, padding:"2px 5px", borderRadius:2,
          color: sc.color, background:`${sc.color}14`, border:`1px solid ${sc.color}22` }}>
          {sc.label}
        </span>
      </div>
      <div style={{ textAlign:"right" }}>
        {canAccept && (
          <button onClick={() => onAccept(entry.dealerId)} style={{ ...mkBtn(isBest ? "#4ade80" : "#2e3a4a"), padding:"3px 8px", fontSize:9 }}>
            DEAL
          </button>
        )}
        {entry.status === "FILLED"   && <span style={{ color:"#818cf8", fontSize:9, fontFamily:"monospace" }}>✓</span>}
        {entry.status === "PASSED"   && <span style={{ color:"#252b38", fontSize:9, fontFamily:"monospace" }}>—</span>}
        {entry.status === "DECLINED" && <span style={{ color:"#252b38", fontSize:9, fontFamily:"monospace" }}>✗</span>}
        {entry.status === "EXPIRED"  && <span style={{ color:"#f97316", fontSize:9, fontFamily:"monospace" }}>⌛</span>}
      </div>
    </div>
  );
}
