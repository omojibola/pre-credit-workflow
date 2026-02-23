import { useState, useRef, useEffect, useCallback } from "react";
import { SuggestedPrompts, buildSuggestions } from "./SuggestedPrompts";
import type { ChatMessage, AssistantContext } from "../../types";

interface Props {
  messages:    ChatMessage[];
  isLoading:   boolean;
  isOpen:      boolean;
  ctx:         AssistantContext;
  onSend:      (text: string, ctx: AssistantContext) => void;
  onClose:     () => void;
  onClear:     () => void;
}

function TypingDots() {
  return (
    <span style={{ display:"inline-flex", gap:3, alignItems:"center", height:16 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:4, height:4, borderRadius:"50%", background:"#e2b96b",
          animation:`assistantDot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }}/>
      ))}
    </span>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display:"flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom:10, padding:"0 12px",
    }}>
      {!isUser && (
        <div style={{
          width:22, height:22, borderRadius:4, background:"linear-gradient(135deg,#0066cc,#004499)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, fontWeight:900, color:"#fff", flexShrink:0, marginRight:7, marginTop:2, letterSpacing:.5,
        }}>AI</div>
      )}
      <div style={{ maxWidth:"82%" }}>
        <div style={{
          padding:"8px 11px", borderRadius:isUser?"10px 10px 3px 10px":"10px 10px 10px 3px",
          background: isUser ? "#0e1e30" : "#0d0d10",
          border:     isUser ? "1px solid #1a3050" : "1px solid #141418",
          color:      isUser ? "#7ec8e3"            : "#bcc4d4",
          fontSize:12, lineHeight:1.55, fontFamily:"'IBM Plex Sans',sans-serif",
          whiteSpace:"pre-wrap",
        }}>
          {msg.isStreaming && !msg.content ? <TypingDots/> : msg.content}
          {msg.isStreaming && msg.content && (
            <span style={{ display:"inline-block", width:2, height:12, background:"#e2b96b",
              marginLeft:2, verticalAlign:"middle", animation:"assistantCursor .7s ease-in-out infinite" }}/>
          )}
        </div>
        <div style={{ fontSize:8, color:"#1e2530", marginTop:3, textAlign:isUser?"right":"left", fontFamily:"monospace" }}>
          {msg.ts}
        </div>
      </div>
      {isUser && (
        <div style={{
          width:22, height:22, borderRadius:4, background:"#0e2030",
          border:"1px solid #1a3040",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, fontWeight:700, color:"#38bdf8", flexShrink:0, marginLeft:7, marginTop:2,
        }}>TRD</div>
      )}
    </div>
  );
}

export function MarketAssistant({ messages, isLoading, isOpen, ctx, onSend, onClose, onClear }: Props) {
  const [input,   setInput]   = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), ctx);
    setInput("");
  }, [input, isLoading, ctx, onSend]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const suggestions = buildSuggestions(ctx.selected, ctx.trades, ctx.rfqState, ctx.scorecard, ctx.sessionDV01);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes assistantDot {
          0%,80%,100% { opacity:.2; transform:scale(.8); }
          40%          { opacity:1;  transform:scale(1.1); }
        }
        @keyframes assistantCursor {
          0%,100% { opacity:1; }
          50%     { opacity:0; }
        }
        @keyframes assistantSlideIn {
          from { transform:translateX(100%); opacity:0; }
          to   { transform:translateX(0);    opacity:1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:99,
          backdropFilter:"blur(1px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, width:420, zIndex:100,
        display:"flex", flexDirection:"column",
        background:"#07080a",
        borderLeft:"1px solid #1a2030",
        boxShadow:"-8px 0 32px rgba(0,0,0,.6)",
        animation:"assistantSlideIn .22s ease-out",
      }}>

        {/* Header */}
        <div style={{
          background:"#08090c", borderBottom:"1px solid #0f1118",
          padding:"0 14px", height:48, display:"flex", alignItems:"center", gap:10, flexShrink:0,
        }}>
          {/* DB badge */}
          <div style={{ background:"#0066cc", color:"#fff", fontWeight:900, fontSize:10, padding:"3px 7px", borderRadius:3, letterSpacing:.5 }}>DB</div>
          <div>
            <div style={{ color:"#e2b96b", fontSize:12, fontWeight:700, letterSpacing:1 }}>MARKET ASSISTANT</div>
            <div style={{ color:"#252b38", fontSize:9, fontFamily:"monospace", letterSpacing:.5 }}>claude-sonnet · live market context</div>
          </div>
          <div style={{ flex:1 }}/>
          {/* Live pulse */}
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontFamily:"monospace" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80",
              animation:isLoading?"none":"assistantDot 2s ease-in-out infinite" }}/>
            <span style={{ color:isLoading?"#fbbf24":"#4ade80", fontWeight:700 }}>{isLoading?"THINKING":"READY"}</span>
          </div>
          {/* Clear */}
          {messages.length > 0 && (
            <button onClick={onClear} style={{
              background:"transparent", border:"1px solid #1a1a24", color:"#2a3040",
              fontSize:8, padding:"3px 7px", borderRadius:2, cursor:"pointer", fontFamily:"inherit", letterSpacing:.5,
            }}>CLEAR</button>
          )}
          {/* Close */}
          <button
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background="#1a0a0a"; e.currentTarget.style.color="#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#2a3040"; }}
            style={{ background:"transparent", border:"1px solid #1a1a24", color:"#2a3040",
              width:24, height:24, borderRadius:3, cursor:"pointer", fontSize:12,
              display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit", transition:"all .15s" }}
          >✕</button>
        </div>

        {/* Context bar — live summary */}
        <div style={{ background:"#0a0b0e", borderBottom:"1px solid #0d0d12", padding:"5px 14px",
          display:"flex", gap:14, flexShrink:0, overflowX:"auto" }}>
          {ctx.selected && (
            <div style={{ display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
              <span style={{ fontSize:8, color:"#1e2530", fontWeight:700, letterSpacing:1 }}>FOCUS</span>
              <span style={{ fontFamily:"monospace", fontSize:10, color:"#e2b96b" }}>{ctx.selected.id}</span>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
            <span style={{ fontSize:8, color:"#1e2530", fontWeight:700, letterSpacing:1 }}>CS01</span>
            <span style={{ fontFamily:"monospace", fontSize:10,
              color: ctx.sessionDV01 > 200_000 ? "#f87171" : ctx.sessionDV01 > 150_000 ? "#fcd34d" : "#4ade80" }}>
              ${ctx.sessionDV01.toLocaleString()}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
            <span style={{ fontSize:8, color:"#1e2530", fontWeight:700, letterSpacing:1 }}>FILLS</span>
            <span style={{ fontFamily:"monospace", fontSize:10, color:"#818cf8" }}>{ctx.trades.length}</span>
          </div>
          {ctx.rfqState && (
            <div style={{ display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
              <span style={{ fontSize:8, color:"#1e2530", fontWeight:700, letterSpacing:1 }}>RFQ</span>
              <span style={{ fontFamily:"monospace", fontSize:10,
                color: ctx.rfqState.status==="QUOTED"?"#4ade80": ctx.rfqState.status==="PENDING"?"#fbbf24":"#f97316" }}>
                {ctx.rfqState.status}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex:1, overflowY:"auto", paddingTop:10 }}>
          {messages.length === 0 ? (
            <div style={{ padding:"32px 20px", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:10, opacity:.4 }}>◈</div>
              <div style={{ color:"#2a3a4a", fontSize:12, lineHeight:1.7, maxWidth:280, margin:"0 auto" }}>
                Your AI market assistant has real-time access to live spreads, your session trades, open RFQs, and dealer performance.
              </div>
              <div style={{ marginTop:12, color:"#1e2530", fontSize:10, fontFamily:"monospace" }}>
                Ask anything or tap a suggestion below
              </div>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)
          )}
        </div>

        {/* Suggestions */}
        <SuggestedPrompts suggestions={suggestions} onSelect={t => { onSend(t, ctx); }} isLoading={isLoading}/>

        {/* Input */}
        <div style={{ padding:"10px 12px", borderTop:"1px solid #0f0f12", background:"#08090b", flexShrink:0 }}>
          <div style={{
            display:"flex", gap:8, alignItems:"flex-end",
            background:"#0d0d10", border:"1px solid #1a1a24", borderRadius:6, padding:"8px 10px",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about spreads, positions, risk, best execution…"
              disabled={isLoading}
              rows={1}
              style={{
                flex:1, background:"transparent", border:"none", outline:"none",
                color:"#8a9ab4", fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif",
                resize:"none", lineHeight:1.5, minHeight:18, maxHeight:100,
                overflowY:"auto",
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                width:30, height:30, borderRadius:5, border:"none", flexShrink:0,
                background: isLoading||!input.trim() ? "#111318" : "linear-gradient(135deg,#0066cc,#0052aa)",
                color:      isLoading||!input.trim() ? "#2a3040"  : "#fff",
                cursor:     isLoading||!input.trim() ? "not-allowed" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all .15s", fontSize:14,
              }}
            >
              {isLoading ? (
                <span style={{ width:12, height:12, border:"2px solid #2a3040", borderTopColor:"#e2b96b",
                  borderRadius:"50%", display:"block", animation:"assistantDot 0.8s linear infinite" }}/>
              ) : "↑"}
            </button>
          </div>
          <div style={{ marginTop:5, fontSize:8, color:"#141820", fontFamily:"monospace", textAlign:"center" }}>
            Enter to send · Shift+Enter for new line · Context auto-injected from live platform state
          </div>
        </div>
      </div>
    </>
  );
}
