import { useState, useEffect } from "react";
import { DV01Gauge }      from "./DV01Gauge";
import { QuoteBars }      from "./QuoteBars";
import { DealerQuoteRow } from "./DealerQuoteRow";
import { panelStyle, panelHeaderStyle, labelStyle, mkBtn } from "../../constants/styles";
import { DESK_DV01_LIMIT, TTL_MS } from "../../constants/instruments";
import { calcDV01, f2 } from "../../utils/formatters";
import type { Instrument, Price, RFQState, TradeSide } from "../../types";

interface Props {
  instrument:  Instrument | null;
  price:       Price | null;
  rfqState:    RFQState | null;
  sessionDV01: number;
  onSendRFQ:   (i: Instrument, side: TradeSide, notional: number, mid: number | null, dealerCount: number) => void;
  onAccept:    (dealerId: string) => void;
  onNewRFQ:    () => void;
}

export function RFQPanel({ instrument, price, rfqState, sessionDV01, onSendRFQ, onAccept, onNewRFQ }: Props) {
  const [notional,     setNotional]     = useState(5_000_000);
  const [side,         setSide]         = useState<TradeSide>("BUY");
  const [dealerCount,  setDealerCount]  = useState(5);
  const [countdown,    setCountdown]    = useState(0);

  const mid         = price?.mid ?? null;
  const dv01        = instrument ? calcDV01(notional, instrument.tenor) : 0;
  const wouldBreach = sessionDV01 + dv01 > DESK_DV01_LIMIT;

  useEffect(() => {
    if (!rfqState?.sentAt || !["PENDING","QUOTED"].includes(rfqState.status)) return;
    const tick = () => setCountdown(Math.max(0, Math.ceil((TTL_MS - (Date.now() - rfqState.sentAt)) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [rfqState?.sentAt, rfqState?.status]);

  if (!instrument) {
    return (
      <div style={{ ...panelStyle, flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#1e2530", fontSize:11, flexDirection:"column", gap:8 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
        <span>Select an instrument to begin</span>
      </div>
    );
  }

  const quotes     = rfqState?.quotes ?? [];
  const liveQ      = quotes.filter((q) => q.status === "QUOTED");
  const bestBidVal = liveQ.length ? Math.max(...liveQ.map((q) => q.bid!)) : null;
  const bestAskVal = liveQ.length ? Math.min(...liveQ.map((q) => q.ask!)) : null;
  const bestBidId  = bestBidVal != null ? liveQ.find((q) => q.bid === bestBidVal)?.dealerId : null;
  const bestAskId  = bestAskVal != null ? liveQ.find((q) => q.ask === bestAskVal)?.dealerId : null;
  const pendingCt  = quotes.filter((q) => q.status === "PENDING").length;
  const status     = rfqState?.status ?? null;
  const isIdle     = !rfqState;
  const isSent     = status === "PENDING" || status === "QUOTED";
  const isDone     = status === "FILLED" || status === "EXPIRED";

  return (
    <div style={{ ...panelStyle, display:"flex", flexDirection:"column", overflow:"hidden", flex:1 }}>
      <div style={panelHeaderStyle}>
        RFQ WORKFLOW
        {rfqState && (
          <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:9,
            color: status==="FILLED"?"#818cf8": status==="QUOTED"?"#4ade80": status==="PENDING"?"#fbbf24":"#f97316" }}>
            {status==="PENDING" ? `AWAITING (${pendingCt})` :
             status==="QUOTED"  ? `LIVE (${liveQ.length}/${rfqState.dealerIds.length})` :
             status ?? ""}
          </span>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
        {/* Instrument */}
        <div style={{ marginBottom:10 }}>
          <div style={{ color:"#e2b96b", fontSize:13, fontWeight:600 }}>{instrument.issuer}</div>
          <div style={{ color:"#252b38", fontSize:10, fontFamily:"monospace" }}>{instrument.id} · {instrument.rating} · {instrument.sector}</div>
        </div>

        {/* Side */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {(["BUY","SELL"] as TradeSide[]).map((s) => (
            <button key={s} onClick={() => !isSent && setSide(s)} style={{
              flex:1, padding:"6px 0", border:"1px solid",
              borderColor: side===s ? (s==="BUY"?"#4ade80":"#f87171") : "#1a1a2a",
              background:  side===s ? (s==="BUY"?"rgba(74,222,128,.1)":"rgba(248,113,113,.1)") : "transparent",
              color:       side===s ? (s==="BUY"?"#4ade80":"#f87171") : "#363d4e",
              fontSize:10, fontWeight:700, cursor: isSent?"default":"pointer",
              borderRadius:3, fontFamily:"inherit", letterSpacing:0.8, opacity: isSent ? 0.6 : 1,
            }}>{s} PROTECTION</button>
          ))}
        </div>

        {/* Notional */}
        <div style={{ marginBottom:10 }}>
          <div style={{ ...labelStyle, marginBottom:3 }}>NOTIONAL</div>
          <input type="range" min={1e6} max={5e7} step={1e6} value={notional}
            onChange={(e) => !isSent && setNotional(+e.target.value)} disabled={isSent}
            style={{ width:"100%", accentColor:"#e2b96b", margin:"3px 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontFamily:"monospace", fontSize:12, color:"#e2b96b" }}>${(notional / 1e6).toFixed(0)}MM</span>
            <span style={{ fontFamily:"monospace", fontSize:10, color:"#3a4a5a" }}>CS01 ~${dv01.toLocaleString()}</span>
          </div>
        </div>

        <DV01Gauge tradeDV01={dv01} sessionDV01={sessionDV01} limit={DESK_DV01_LIMIT}/>

        {/* Dealer count */}
        {isIdle && (
          <div style={{ marginBottom:10 }}>
            <div style={{ ...labelStyle, marginBottom:4 }}>DEALERS TO QUERY</div>
            <div style={{ display:"flex", gap:4 }}>
              {[3,4,5,6,7].map((n) => (
                <button key={n} onClick={() => setDealerCount(n)} style={{
                  flex:1, padding:"4px 0", fontSize:10, fontWeight:700,
                  border:`1px solid ${dealerCount===n?"#e2b96b":"#1a1a2a"}`,
                  background: dealerCount===n ? "rgba(226,185,107,.1)" : "transparent",
                  color: dealerCount===n ? "#e2b96b" : "#363d4e",
                  cursor:"pointer", borderRadius:2, fontFamily:"inherit",
                }}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {/* Pre-trade analytics */}
        <div style={{ background:"#0c0d0f", border:"1px solid #141418", borderRadius:3, padding:"8px", marginBottom:10 }}>
          {([
            ["MKT MID",    mid ? `${f2(mid)}bps` : "—"],
            ["BID / ASK",  price ? `${f2(price.bid)} / ${f2(price.ask)}` : "—"],
            ["½ SPREAD",   price ? `${f2((price.ask - price.bid) / 2)}bps` : "—"],
            ["CS01 (DV01)",`$${dv01.toLocaleString()}`],
          ] as [string,string][]).map(([k, v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid #0e0e0e" }}>
              <span style={labelStyle}>{k}</span>
              <span style={{ fontFamily:"monospace", fontSize:11, color:"#6a7a8a" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Quote table */}
        {isSent && quotes.length > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={labelStyle}>COMPETING QUOTES</span>
              {!isDone && (
                <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:600,
                  color: countdown<=5?"#f87171": countdown<=10?"#fcd34d":"#4a5a6a" }}>
                  TTL {countdown}s
                </span>
              )}
            </div>
            {liveQ.length > 0 && (
              <div style={{ background:"#0c0d0f", border:"1px solid #141a14", borderRadius:3, padding:"8px", marginBottom:6, display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                <div>
                  <div style={labelStyle}>BEST BID</div>
                  <div style={{ fontFamily:"monospace", fontSize:13, color:"#4ade80", fontWeight:700 }}>{f2(bestBidVal)}</div>
                  <div style={{ fontFamily:"monospace", fontSize:9, color:"#2e3545" }}>{bestBidId}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={labelStyle}>BEST ASK</div>
                  <div style={{ fontFamily:"monospace", fontSize:13, color:"#f87171", fontWeight:700 }}>{f2(bestAskVal)}</div>
                  <div style={{ fontFamily:"monospace", fontSize:9, color:"#2e3545" }}>{bestAskId}</div>
                </div>
              </div>
            )}
            <QuoteBars quotes={quotes} side={side}/>
            <div style={{ display:"grid", gridTemplateColumns:"72px 64px 64px 64px 72px 52px",
              padding:"3px 10px", background:"#0d0d0f", borderBottom:"1px solid #111" }}>
              {["DEALER","BID","MID","ASK","STATUS",""].map((h) => (
                <div key={h} style={{ fontSize:8, letterSpacing:1.2, color:"#1e2530", fontWeight:700, textAlign: h==="DEALER"?"left":"right" }}>{h}</div>
              ))}
            </div>
            {quotes.map((q) => (
              <DealerQuoteRow key={q.dealerId} entry={q} side={side}
                isBestBid={q.dealerId === bestBidId && liveQ.length > 0}
                isBestAsk={q.dealerId === bestAskId && liveQ.length > 0}
                onAccept={onAccept} rfqStatus={rfqState!.status} countdown={countdown}/>
            ))}
          </div>
        )}

        {/* Fill */}
        {status === "FILLED" && rfqState && (
          <div style={{ background:"rgba(129,140,248,.05)", border:"1px solid rgba(129,140,248,.2)", borderRadius:3, padding:"10px", marginBottom:10 }}>
            <div style={{ color:"#818cf8", fontWeight:700, fontSize:12, marginBottom:6 }}>✓ TRADE EXECUTED</div>
            {([
              ["DEALER",    rfqState.filledDealerId ?? "—"],
              ["FILL PRICE",`${f2(rfqState.fillPrice)}bps`],
              ["CS01",      `$${dv01.toLocaleString()}`],
              ["SLIPPAGE",  `${f2(rfqState.slippage)}bps`],
              ["COVER",     rfqState.coverPrice ? `${f2(rfqState.coverPrice)}bps` : "—"],
            ] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"2px 0" }}>
                <span style={labelStyle}>{k}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#818cf8" }}>{v}</span>
              </div>
            ))}
            <button onClick={onNewRFQ} style={{ width:"100%", marginTop:8, ...mkBtn("#818cf8"), padding:"7px 0" }}>NEW RFQ</button>
          </div>
        )}
        {status === "EXPIRED" && (
          <div style={{ background:"rgba(249,115,22,.04)", border:"1px solid rgba(249,115,22,.2)", borderRadius:3, padding:"10px", marginBottom:10, textAlign:"center" }}>
            <div style={{ color:"#f97316", fontWeight:700, fontSize:11, marginBottom:6 }}>QUOTE WINDOW EXPIRED</div>
            <button onClick={onNewRFQ} style={{ ...mkBtn("#f97316"), padding:"5px 18px" }}>REQUEST AGAIN</button>
          </div>
        )}

        {isIdle && (
          <button
            onClick={() => !wouldBreach && onSendRFQ(instrument, side, notional, mid, dealerCount)}
            style={{
              width:"100%", padding:"10px 0",
              background: wouldBreach ? "#120a0a" : "linear-gradient(90deg,#0e1e2e,#122334)",
              border: `1px solid ${wouldBreach ? "#3a1010" : "#1e3040"}`,
              color:  wouldBreach ? "#f87171" : "#e2b96b",
              fontWeight:700, fontSize:12, letterSpacing:1.5,
              cursor: wouldBreach ? "not-allowed" : "pointer", borderRadius:3, fontFamily:"inherit",
            }}>
            {wouldBreach ? "⚠ LIMIT BREACH — BLOCKED" : `SEND RFQ TO ${dealerCount} DEALERS →`}
          </button>
        )}
        {status === "PENDING" && (
          <div style={{ textAlign:"center", padding:"8px", color:"#fbbf24", fontSize:11, fontFamily:"monospace" }}>
            Awaiting dealer quotes…
          </div>
        )}
      </div>
    </div>
  );
}
