import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { mkBtn } from "../../constants/styles";
import { f2 } from "../../utils/formatters";
import type { Trade, PriceHistoryPoint } from "../../types";

interface Props {
  trade:   Trade;
  history: PriceHistoryPoint[];
  onClose: () => void;
}

export function ReplayPanel({ trade, history, onClose }: Props) {
  const [step,    setStep]  = useState(0);
  const [playing, setPlay]  = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data     = useMemo(() => history.slice(0, step + 1), [history, step]);
  const fillIdx  = useMemo(() => Math.floor(history.length * 0.78), [history.length]);
  const fillMark = history[fillIdx];

  useEffect(() => {
    if (!playing) return;
    if (step >= history.length - 1) { setPlay(false); return; }
    timer.current = setTimeout(() => setStep((s) => s + 1), 70);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, step, history.length]);

  return (
    <div style={{ borderTop:"1px solid #141428", background:"#090a0c", padding:"10px 14px", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span style={{ fontSize:9, letterSpacing:1, color:"#818cf8", fontWeight:700 }}>REPLAY · {trade.instrument.id}</span>
        <span style={{ fontFamily:"monospace", fontSize:9, color:"#252b38" }}>
          {trade.side} ${(trade.notional / 1e6).toFixed(0)}MM @ {f2(trade.fillPrice)}bps via {trade.dealer}
        </span>

        {/* Close button */}
        <button
          onClick={onClose}
          onMouseEnter={(e) => { const el = e.currentTarget; el.style.background="#2a1a1a"; el.style.color="#f87171"; el.style.borderColor="#f8717144"; }}
          onMouseLeave={(e) => { const el = e.currentTarget; el.style.background="#141418"; el.style.color="#4a5068"; el.style.borderColor="#2a2a32"; }}
          style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background:"#141418",
            border:"1px solid #2a2a32", color:"#4a5068", fontSize:12, lineHeight:"20px",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"inherit", transition:"all .15s", flexShrink:0 }}
          title="Close replay"
        >✕</button>

        <button onClick={() => { setStep(0); setPlay(true); }} style={{ ...mkBtn("#818cf8"), padding:"3px 12px", fontSize:9 }}>
          {playing ? "■ STOP" : "▶ PLAY"}
        </button>
        <input type="range" min={0} max={Math.max(0, history.length - 1)} value={step}
          onChange={(e) => { setPlay(false); setStep(+e.target.value); }}
          style={{ width:80, accentColor:"#818cf8" }}/>
      </div>

      <ResponsiveContainer width="100%" height={76}>
        <AreaChart data={data} margin={{ top:4, right:4, left:-28, bottom:0 }}>
          <defs>
            <linearGradient id="replayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis domain={["auto","auto"]} tick={{ fill:"#1e2530", fontSize:8 }}/>
          <XAxis dataKey="t" hide/>
          <Tooltip
            contentStyle={{ background:"#0c0d0f", border:"1px solid #1a1a2a", padding:"3px 8px", borderRadius:3 }}
            labelStyle={{ display:"none" }} itemStyle={{ color:"#818cf8", fontSize:9, fontFamily:"monospace" }}
            formatter={(v: number) => [`${v.toFixed(2)}bps`]}
          />
          <Area type="monotone" dataKey="mid" stroke="#818cf8" fill="url(#replayGrad)" dot={false} strokeWidth={1.5} isAnimationActive={false}/>
          {step >= fillIdx && fillMark && (
            <ReferenceLine x={fillMark.t} stroke="#e2b96b" strokeDasharray="3 2"
              label={{ value:`@ ${f2(trade.fillPrice)}`, position:"insideTopRight", fill:"#e2b96b", fontSize:8, fontFamily:"monospace" }}/>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
