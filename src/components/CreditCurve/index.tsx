import { memo } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { INSTRUMENTS } from "../../constants/instruments";
import { panelStyle, panelHeaderStyle } from "../../constants/styles";
import { ratingColor } from "../../utils/colors";
import type { Instrument, Price } from "../../types";

interface Props {
  instrument: Instrument;
  prices:     Record<string, Price>;
}

export const CreditCurve = memo(function CreditCurve({ instrument, prices }: Props) {
  const { ticker, issuer, rating } = instrument;

  const curveData = ["3Y","5Y","7Y"].map((tenor) => {
    const inst = INSTRUMENTS.find((i) => i.ticker === ticker && i.tenor === tenor);
    const p    = inst ? prices[inst.id] : null;
    return { tenor, mid: p?.mid ?? null, bid: p?.bid ?? null, ask: p?.ask ?? null };
  }).filter((d): d is { tenor: string; mid: number; bid: number; ask: number } => d.mid != null);

  if (curveData.length < 2) return null;

  return (
    <div style={{ ...panelStyle, borderTop:"1px solid #0f0f12", flexShrink:0 }}>
      <div style={panelHeaderStyle}>
        CREDIT CURVE · {ticker}
        <span style={{ marginLeft:6, color:ratingColor(rating), fontFamily:"monospace", fontSize:9 }}>{rating}</span>
        <span style={{ marginLeft:"auto", color:"#1e2530", fontSize:9, fontWeight:400 }}>{issuer}</span>
      </div>
      <div style={{ padding:"8px 10px" }}>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={curveData} margin={{ top:4, right:4, left:-22, bottom:0 }} barCategoryGap="20%">
            <XAxis dataKey="tenor" tick={{ fill:"#3a4050", fontSize:9 }} axisLine={false} tickLine={false}/>
            <YAxis domain={["auto","auto"]} tick={{ fill:"#2a3040", fontSize:8 }} axisLine={false} tickLine={false}/>
            <Tooltip
              contentStyle={{ background:"#0c0d0f", border:"1px solid #1a1a2a", padding:"5px 10px", borderRadius:3 }}
              itemStyle={{ fontFamily:"monospace", fontSize:10 }}
              formatter={(v: number, n: string) => [`${v.toFixed(2)}bps`, n.toUpperCase()]}
            />
            <Bar dataKey="bid" name="bid" maxBarSize={28} radius={[2,2,0,0]}>
              {curveData.map((_, i) => <Cell key={i} fill="#4ade8033"/>)}
            </Bar>
            <Bar dataKey="mid" name="mid" maxBarSize={28} radius={[2,2,0,0]}>
              {curveData.map((_, i) => <Cell key={i} fill="#e2b96b"/>)}
            </Bar>
            <Bar dataKey="ask" name="ask" maxBarSize={28} radius={[2,2,0,0]}>
              {curveData.map((_, i) => <Cell key={i} fill="#f8717133"/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", gap:14, justifyContent:"center", marginTop:2 }}>
          {([["#4ade80","BID"],["#e2b96b","MID"],["#f87171","ASK"]] as [string,string][]).map(([c, l]) => (
            <span key={l} style={{ fontSize:8, color:c, fontFamily:"monospace" }}>■ {l}</span>
          ))}
        </div>
      </div>
    </div>
  );
});
