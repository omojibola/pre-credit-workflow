import type { CSSProperties } from "react";

export const SECTOR_BG: Record<string, string> = {
  TMT:"#1e1b3a", FIN:"#0e2233", NRG:"#2a1f0e", HLT:"#0e2a1a",
  UTL:"#1e1a2e", IND:"#1e1e1e", MTL:"#1a1a2e", CST:"#2a1a1e",
  INS:"#1a2a2e", MDI:"#2a2a1e",
};

export const SECTOR_FG: Record<string, string> = {
  TMT:"#818cf8", FIN:"#38bdf8", NRG:"#fb923c", HLT:"#4ade80",
  UTL:"#a78bfa", IND:"#94a3b8", MTL:"#c084fc", CST:"#fb7185",
  INS:"#22d3ee", MDI:"#fbbf24",
};

export const AUDIT_COLORS: Record<string, string> = {
  SYSTEM:"#2a3a4a",    RFQ_SENT:"#e2b96b",      QUOTE_RECEIVED:"#4ade80",
  DEALER_DECLINED:"#252b38", TRADE_FILLED:"#818cf8", QUOTE_EXPIRED:"#f97316",
  PASS_SENT:"#252b38", INSTRUMENT_SELECT:"#38bdf8", FILTER:"#a78bfa",
  SORT:"#a78bfa",      BEST_EXECUTION:"#fbbf24",
};

// Shared panel chrome styles
export const panelStyle: CSSProperties = {
  border:"1px solid #0f0f12", background:"#090a0c",
};

export const panelHeaderStyle: CSSProperties = {
  background:"#0c0d0f", padding:"5px 12px", fontSize:10, letterSpacing:2,
  color:"#2a3040", fontWeight:700, borderBottom:"1px solid #0f0f12",
  display:"flex", alignItems:"center", flexShrink:0,
};

export const labelStyle: CSSProperties = {
  fontSize:9, letterSpacing:1, color:"#2a3040", fontWeight:700,
};

export function mkBtn(color: string, extra: CSSProperties = {}): CSSProperties {
  return {
    border:`1px solid ${color}33`, background:`${color}12`, color,
    fontSize:10, fontWeight:700, cursor:"pointer", borderRadius:3,
    fontFamily:"inherit", letterSpacing:0.5, ...extra,
  };
}
