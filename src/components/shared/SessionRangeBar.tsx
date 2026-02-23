import { memo } from "react";

interface Props { hi: number | null; lo: number | null; mid: number }

export const SessionRangeBar = memo(function SessionRangeBar({ hi, lo, mid }: Props) {
  if (!hi || !lo || hi === lo) {
    return <span style={{ color:"#1e2530", fontSize:9, fontFamily:"monospace" }}>—</span>;
  }
  const pct = Math.max(0, Math.min(100, ((mid - lo) / (hi - lo)) * 100));
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5, paddingRight:8, flex:1 }}>
      <span style={{ fontFamily:"monospace", fontSize:9, color:"#252b38", minWidth:30, textAlign:"right" }}>
        {lo.toFixed(0)}
      </span>
      <div style={{ flex:1, height:3, background:"#141820", borderRadius:2, position:"relative", minWidth:40 }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#1a3020,#3a2a10)", borderRadius:2 }}/>
        <div style={{
          position:"absolute", top:-2, width:6, height:7,
          background:"#e2b96b", boxShadow:"0 0 4px #e2b96b88",
          borderRadius:1, left:`calc(${pct}% - 3px)`, transition:"left .3s",
        }}/>
      </div>
      <span style={{ fontFamily:"monospace", fontSize:9, color:"#252b38", minWidth:30 }}>
        {hi.toFixed(0)}
      </span>
    </div>
  );
});
