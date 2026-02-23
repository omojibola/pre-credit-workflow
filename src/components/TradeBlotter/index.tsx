import { panelStyle, panelHeaderStyle } from "../../constants/styles";
import { DEALERS } from "../../constants/dealers";
import { ReplayPanel } from "../ReplayPanel";
import { f2, calcDV01 } from "../../utils/formatters";
import type { Trade, Price, PriceHistoryPoint } from "../../types";

interface Props {
  trades:          Trade[];
  history:         Record<string, PriceHistoryPoint[]>;
  prices:          Record<string, Price>;
  replayTrade:     Trade | null;
  onSelectReplay:  (t: Trade) => void;
  onCloseReplay:   () => void;
}

const HEADERS = ["TIME","INSTRUMENT","SIDE","NOT'L","FILL","MID","SLIPPAGE","CS01","DEALER","MTM P&L",""];
const GRID    = "70px 140px 44px 64px 68px 64px 64px 60px 56px 96px 28px";

export function TradeBlotter({ trades, history, prices, replayTrade, onSelectReplay, onCloseReplay }: Props) {
  return (
    <div style={{ ...panelStyle, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={panelHeaderStyle}>
        TRADE BLOTTER — EXECUTED FILLS
        <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:9, color:"#1e2530" }}>{trades.length} fills</span>
      </div>
      {trades.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#1a2030", fontSize:11 }}>
          No fills yet — execute an RFQ
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", minHeight:0 }}>
          <div style={{ display:"grid", gridTemplateColumns:GRID,
            padding:"3px 12px", background:"#0c0d0f", borderBottom:"1px solid #111", position:"sticky", top:0, zIndex:1 }}>
            {HEADERS.map((h) => (
              <div key={h} style={{ fontSize:8, letterSpacing:1.2, color:"#1e2530", fontWeight:700,
                textAlign: h==="INSTRUMENT"||h==="SIDE"||h==="" ? "left" : "right" }}>{h}</div>
            ))}
          </div>
          {trades.slice().reverse().map((t) => {
            const curMid = prices[t.instrument.id]?.mid ?? null;
            const dv01   = calcDV01(t.notional, t.instrument.tenor);
            const bpsPnl = curMid != null
              ? +(t.side === "BUY" ? curMid - t.fillPrice : t.fillPrice - curMid).toFixed(2)
              : null;
            const usdPnl = bpsPnl != null ? Math.round(bpsPnl * dv01) : null;
            const dealer = DEALERS.find((d) => d.id === t.dealer);
            return (
              <div key={t.id} onClick={() => onSelectReplay(t)} style={{
                display:"grid", gridTemplateColumns:GRID,
                padding:"5px 12px", borderBottom:"1px solid #0e0e0e", cursor:"pointer",
                background: replayTrade?.id === t.id ? "rgba(129,140,248,.04)" : "transparent",
                borderLeft: replayTrade?.id === t.id ? "2px solid #818cf8" : "2px solid transparent",
              }}>
                <span style={{ fontFamily:"monospace", fontSize:9, color:"#2a3040" }}>{t.filledAt}</span>
                <div>
                  <div style={{ fontSize:11, color:"#aab4c4", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.instrument.issuer}</div>
                  <div style={{ fontSize:9, fontFamily:"monospace", color:"#1e2530" }}>{t.instrument.id}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color: t.side==="BUY"?"#4ade80":"#f87171" }}>{t.side}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#5a6478", textAlign:"right" }}>${(t.notional/1e6).toFixed(0)}MM</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#e2b96b",  textAlign:"right" }}>{f2(t.fillPrice)}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#5a6478",  textAlign:"right" }}>{curMid != null ? f2(curMid) : "—"}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, textAlign:"right", color: t.slippage > 2 ? "#f87171" : "#4ade80" }}>{f2(t.slippage)}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:"#4a5568",  textAlign:"right" }}>${dv01.toLocaleString()}</span>
                <span style={{ fontFamily:"monospace", fontSize:10, textAlign:"right", color: dealer?.color ?? "#666" }}>{t.dealer}</span>
                <div style={{ textAlign:"right" }}>
                  {usdPnl != null ? (
                    <div>
                      <div style={{ fontFamily:"monospace", fontSize:10, fontWeight:600, color: usdPnl>=0?"#4ade80":"#f87171" }}>
                        {usdPnl >= 0 ? `+$${usdPnl.toLocaleString()}` : `-$${Math.abs(usdPnl).toLocaleString()}`}
                      </div>
                      <div style={{ fontFamily:"monospace", fontSize:9, color: bpsPnl!>=0?"#2a4a2a":"#4a2a2a" }}>
                        {bpsPnl!>=0?"+":""}{f2(bpsPnl)}bps
                      </div>
                    </div>
                  ) : <span style={{ color:"#1e2530", fontSize:10 }}>—</span>}
                </div>
                <span style={{ fontSize:9, color:"#38bdf8", textAlign:"right", alignSelf:"center" }}>▶</span>
              </div>
            );
          })}
        </div>
      )}
      {replayTrade && (
        <ReplayPanel
          trade={replayTrade}
          history={history[replayTrade.instrument.id] ?? []}
          onClose={onCloseReplay}
        />
      )}
    </div>
  );
}
