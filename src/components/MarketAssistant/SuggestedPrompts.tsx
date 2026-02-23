import type { Instrument, Trade, RFQState, Scorecard } from "../../types";

export interface Suggestion {
  label: string;
  prompt: string;
  color: string;
}

export function buildSuggestions(
  selected:  Instrument | null,
  trades:    Trade[],
  rfqState:  RFQState | null,
  scorecard: Scorecard,
  sessionDV01: number,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Always available
  suggestions.push({ label:"Session summary",       prompt:"Give me a concise summary of my trading session so far.",                          color:"#38bdf8" });
  suggestions.push({ label:"Top movers",            prompt:"Which instruments have moved the most this session and why might that be?",         color:"#818cf8" });

  // Instrument-specific
  if (selected) {
    suggestions.push({ label:`Analyse ${selected.ticker}`,    prompt:`Analyse ${selected.id} (${selected.issuer}). Is the current spread level attractive and what does the credit curve tell us?`, color:"#e2b96b" });
    suggestions.push({ label:"Entry timing",                  prompt:`Based on the session range and current spread level for ${selected.id}, is now a good time to put on a position?`,           color:"#fbbf24" });
  }

  // Active RFQ
  if (rfqState && rfqState.status === "QUOTED") {
    const liveQ = rfqState.quotes.filter(q => q.status === "QUOTED");
    if (liveQ.length > 0) {
      suggestions.push({ label:"Best quote?", prompt:`I have ${liveQ.length} competing quotes for my RFQ on ${rfqState.instrument.id}. Which dealer should I deal with and why?`, color:"#4ade80" });
    }
  }

  // Trades exist
  if (trades.length > 0) {
    suggestions.push({ label:"Book position",   prompt:"How is my book positioned? Summarise my net exposure, P&L and biggest risks.",         color:"#a78bfa" });
    suggestions.push({ label:"Slippage review", prompt:"Which of my trades had the worst slippage and what does that suggest about execution?", color:"#fb923c" });
  }

  // Dealer scorecard exists
  if (Object.keys(scorecard).length > 0) {
    suggestions.push({ label:"Dealer review", prompt:"Based on session performance, which dealers should I prioritise in future RFQs and who should I drop?", color:"#22d3ee" });
  }

  // Risk warning
  if (sessionDV01 > 150_000) {
    suggestions.push({ label:"Risk check", prompt:"How close am I to my CS01 limit? Should I be concerned about any of my positions?", color:"#f87171" });
  }

  return suggestions.slice(0, 5); // Cap at 5 chips
}

interface Props {
  suggestions:  Suggestion[];
  onSelect:     (prompt: string) => void;
  isLoading:    boolean;
}

export function SuggestedPrompts({ suggestions, onSelect, isLoading }: Props) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:5, padding:"8px 12px", borderTop:"1px solid #0f0f12" }}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          disabled={isLoading}
          onClick={() => onSelect(s.prompt)}
          style={{
            fontSize:9, padding:"3px 8px", borderRadius:10, cursor:isLoading?"not-allowed":"pointer",
            border:`1px solid ${s.color}30`, background:`${s.color}0e`, color:s.color,
            fontFamily:"inherit", fontWeight:600, letterSpacing:.3,
            opacity:isLoading?0.5:1, transition:"all .15s",
            whiteSpace:"nowrap",
          }}
        >{s.label}</button>
      ))}
    </div>
  );
}
