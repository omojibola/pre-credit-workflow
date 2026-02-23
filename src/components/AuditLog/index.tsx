import { useEffect, useRef, memo } from "react";
import { panelStyle, panelHeaderStyle, AUDIT_COLORS } from "../../constants/styles";
import type { AuditEntry } from "../../types";

interface Props { entries: AuditEntry[] }

export const AuditLog = memo(function AuditLog({ entries }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);

  return (
    <div style={{ ...panelStyle, flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={panelHeaderStyle}>
        AUDIT LOG — MiFID II COMPLIANCE
        <span style={{ marginLeft:"auto", fontFamily:"monospace", fontSize:9, color:"#1e2530" }}>{entries.length} events</span>
      </div>
      <div ref={ref} style={{ flex:1, overflowY:"auto" }}>
        {entries.map((e, i) => (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:"72px 150px 1fr",
            padding:"3px 12px", fontSize:10, fontFamily:"monospace", borderBottom:"1px solid #0c0c0c",
            background: i === entries.length - 1 ? "rgba(255,255,255,.012)" : "transparent",
          }}>
            <span style={{ color:"#1e2530" }}>{e.time}</span>
            <span style={{ color: AUDIT_COLORS[e.type] ?? "#2e3545", fontWeight:600, letterSpacing:.3 }}>{e.type}</span>
            <span style={{ color:"#2e3a4a" }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
