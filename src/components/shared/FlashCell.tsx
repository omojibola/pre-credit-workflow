import { useState, useEffect, useRef, memo } from "react";

interface FlashCellProps {
  value:     number | null;
  direction: -1 | 0 | 1;
  decimals?: number;
  width?:    number;
}

export const FlashCell = memo(function FlashCell({
  value, direction, decimals = 2, width = 64,
}: FlashCellProps) {
  const [active, setActive] = useState(false);
  const dirRef  = useRef<number>(0);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (direction !== 0 && direction !== dirRef.current) {
      dirRef.current = direction;
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), 700);
    }
  }, [value, direction]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bg    = active ? (direction > 0 ? "rgba(248,113,113,.22)" : "rgba(74,222,128,.22)") : "transparent";
  const color = active ? (direction > 0 ? "#fca5a5" : "#86efac") : "#8a93a8";

  return (
    <span style={{
      display:"inline-block", width, textAlign:"right",
      fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums", fontSize:12,
      background:bg, color, transition:"background .1s, color .7s", borderRadius:2, padding:"1px 4px",
    }}>
      {value != null ? Number(value).toFixed(decimals) : "—"}
    </span>
  );
}, (p, n) => p.value === n.value && p.direction === n.direction);
