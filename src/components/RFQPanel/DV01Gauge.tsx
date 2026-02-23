import { labelStyle } from "../../constants/styles";

interface Props {
  tradeDV01:  number;
  sessionDV01: number;
  limit:      number;
}

export function DV01Gauge({ tradeDV01, sessionDV01, limit }: Props) {
  const usedPct     = Math.min(100, (sessionDV01 / limit) * 100);
  const addPct      = Math.min(100, ((sessionDV01 + tradeDV01) / limit) * 100);
  const wouldBreach = sessionDV01 + tradeDV01 > limit;
  const barColor    = usedPct > 85 ? "#f87171" : usedPct > 65 ? "#fcd34d" : "#4ade80";

  return (
    <div style={{
      background:"#0c0d0f",
      border:`1px solid ${wouldBreach ? "#f8717130" : "#141418"}`,
      borderRadius:3, padding:"8px", marginBottom:10,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ ...labelStyle, color: wouldBreach ? "#f87171" : "#2a3040" }}>CS01 DESK LIMIT</span>
        <span style={{ fontFamily:"monospace", fontSize:9, color: wouldBreach ? "#f87171" : "#3a4a5a" }}>
          ${sessionDV01.toLocaleString()} / ${limit.toLocaleString()}
        </span>
      </div>
      <div style={{ height:5, background:"#0e0f12", borderRadius:3, overflow:"hidden", position:"relative", marginBottom:5 }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${usedPct}%`, background:barColor, borderRadius:3, transition:"width .3s" }}/>
        {tradeDV01 > 0 && (
          <div style={{ position:"absolute", left:`${usedPct}%`, top:0, bottom:0,
            width:`${Math.max(0, addPct - usedPct)}%`,
            background:`${wouldBreach ? "#f87171" : "#818cf8"}66`, borderRadius:3 }}/>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, fontFamily:"monospace" }}>
        <span style={{ color: wouldBreach ? "#f87171" : "#3a4a5a" }}>
          {wouldBreach ? "⚠ WOULD BREACH LIMIT" : `+$${tradeDV01.toLocaleString()} this trade`}
        </span>
        <span style={{ color:"#2a3040" }}>${Math.max(0, limit - sessionDV01).toLocaleString()} remaining</span>
      </div>
    </div>
  );
}
