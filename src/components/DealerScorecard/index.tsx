import { panelStyle, panelHeaderStyle } from "../../constants/styles";
import { DEALERS } from "../../constants/dealers";
import type { Scorecard } from "../../types";

interface RowData {
  id:         string;
  sent:       number;
  responded:  number;
  wins:       number;
  respPct:    number;
  winPct:     number;
  avgSprd:    number | null;
  avgRespMs:  number | null;
}

const GRID = "76px 1fr 60px 72px 72px 80px 80px";

interface Props { scorecard: Scorecard }

export function DealerScorecard({ scorecard }: Props) {
  const rows: RowData[] = Object.entries(scorecard)
    .map(([id, s]) => ({
      id, ...s,
      respPct:   s.sent     ? Math.round((s.responded / s.sent)     * 100) : 0,
      winPct:    s.responded ? Math.round((s.wins     / s.responded) * 100) : 0,
      avgSprd:   s.responded ? +(s.totalSpread     / s.responded).toFixed(2) : null,
      avgRespMs: s.responded ? Math.round(s.totalResponseMs / s.responded)   : null,
    }))
    .sort((a, b) => b.winPct - a.winPct);

  if (!rows.length) {
    return (
      <div style={{ ...panelStyle, flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#1a2030", fontSize:11 }}>
        Send RFQs to see dealer performance
      </div>
    );
  }

  return (
    <div style={{ ...panelStyle, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={panelHeaderStyle}>DEALER SCORECARD — SESSION PERFORMANCE</div>
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:GRID,
          padding:"4px 14px", background:"#0c0d0f", borderBottom:"1px solid #111", position:"sticky", top:0 }}>
          {["DEALER","","SENT","RESP %","WIN %","AVG TIME","AVG SPRD"].map((h) => (
            <div key={h} style={{ fontSize:8, letterSpacing:1.2, color:"#1e2530", fontWeight:700,
              textAlign: h==="DEALER"||h==="" ? "left" : "right" }}>{h}</div>
          ))}
        </div>
        {rows.map((r) => {
          const dealer = DEALERS.find((d) => d.id === r.id);
          const respCol = r.respPct > 80 ? "#4ade80" : r.respPct > 60 ? "#fcd34d" : "#f87171";
          return (
            <div key={r.id} style={{ display:"grid", gridTemplateColumns:GRID,
              padding:"6px 14px", borderBottom:"1px solid #0e0e0e", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:3, height:3, borderRadius:"50%", background: dealer?.color ?? "#444" }}/>
                <span style={{ fontFamily:"monospace", fontSize:11, color: dealer?.color ?? "#666", fontWeight:600 }}>{r.id}</span>
              </div>
              <span style={{ fontSize:10, color:"#2e3a4a" }}>{dealer?.name ?? ""}</span>
              <span style={{ fontFamily:"monospace", fontSize:11, color:"#3a4a5a", textAlign:"right" }}>{r.sent}</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"monospace", fontSize:11, color:respCol }}>{r.respPct}%</div>
                <div style={{ height:2, background:"#0e0e0e", borderRadius:1, marginTop:2 }}>
                  <div style={{ height:"100%", width:`${r.respPct}%`, background:respCol, borderRadius:1 }}/>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"monospace", fontSize:11, color: r.winPct>25?"#818cf8":"#2e3a4a" }}>
                  {r.wins > 0 ? `${r.winPct}%` : "—"}
                </div>
                {r.wins > 0 && (
                  <div style={{ height:2, background:"#0e0e0e", borderRadius:1, marginTop:2 }}>
                    <div style={{ height:"100%", width:`${r.winPct}%`, background:"#818cf8", borderRadius:1 }}/>
                  </div>
                )}
              </div>
              <span style={{ fontFamily:"monospace", fontSize:11, color:"#3a4a5a", textAlign:"right" }}>
                {r.avgRespMs != null ? `${r.avgRespMs}ms` : "—"}
              </span>
              <span style={{ fontFamily:"monospace", fontSize:11, color:"#3a4a5a", textAlign:"right" }}>
                {r.avgSprd != null ? `${r.avgSprd}bps` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
