import { memo } from "react";
import { FlashCell }        from "../shared/FlashCell";
import { SessionRangeBar }  from "../shared/SessionRangeBar";
import { ratingColor }      from "../../utils/colors";
import { SECTOR_BG, SECTOR_FG } from "../../constants/styles";
import { ROW_HEIGHT } from "../../constants/instruments";
import type { Instrument, Price, SessionHiLo } from "../../types";

interface Props {
  instrument: Instrument;
  price:      Price | null;
  hiLo:       SessionHiLo | null;
  isSelected: boolean;
  onSelect:   (i: Instrument) => void;
}

export const BlotterRow = memo(function BlotterRow({ instrument, price, hiLo, isSelected, onSelect }: Props) {
  const { id, issuer, sector, rating, tenor } = instrument;
  const spd  = price ? +(price.ask - price.bid).toFixed(2) : null;
  const chg  = hiLo && price ? +(price.mid - hiLo.open).toFixed(2) : null;

  return (
    <div
      onClick={() => onSelect(instrument)}
      style={{
        display:"grid",
        gridTemplateColumns:"190px 46px 52px 40px 65px 65px 65px 60px 1fr",
        alignItems:"center", height:ROW_HEIGHT, padding:"0 0 0 12px", cursor:"pointer",
        borderBottom:"1px solid #0e0e0e",
        background: isSelected ? "rgba(226,185,107,.05)" : "transparent",
        borderLeft:  isSelected ? "2px solid #e2b96b" : "2px solid transparent",
      }}
    >
      <div>
        <div style={{ color:"#bcc4d4", fontSize:12, fontWeight:500, lineHeight:1.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {issuer}
        </div>
        <div style={{ color:"#242a38", fontSize:9, fontFamily:"monospace" }}>{id}</div>
      </div>
      <div>
        <span style={{ fontSize:9, fontWeight:700, padding:"2px 4px", borderRadius:2,
          background: SECTOR_BG[sector] ?? "#1a1a1a", color: SECTOR_FG[sector] ?? "#666" }}>
          {sector}
        </span>
      </div>
      <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:600, color:ratingColor(rating), textAlign:"center" }}>
        {rating}
      </div>
      <div style={{ fontFamily:"monospace", fontSize:11, color:"#363d4e", textAlign:"center" }}>{tenor}</div>
      <div style={{ textAlign:"right", paddingRight:4 }}>
        <FlashCell value={price?.bid ?? null} direction={price?.bidFlash ?? 0}/>
      </div>
      <div style={{ textAlign:"right", paddingRight:4 }}>
        <FlashCell value={price?.mid ?? null} direction={price?.midFlash ?? 0}/>
      </div>
      <div style={{ textAlign:"right", paddingRight:4 }}>
        <FlashCell value={price?.ask ?? null} direction={price?.askFlash ?? 0}/>
      </div>
      <div style={{ textAlign:"right", paddingRight:6, fontFamily:"monospace", fontSize:11,
        color: chg == null ? "#1e2530" : chg > 0 ? "#f87171" : chg < 0 ? "#4ade80" : "#363d4e" }}>
        {chg != null ? (chg > 0 ? "+" : "") + chg.toFixed(1) : "—"}
      </div>
      <SessionRangeBar hi={hiLo?.hi ?? null} lo={hiLo?.lo ?? null} mid={price?.mid ?? 0}/>
    </div>
  );
}, (p, n) => {
  if (p.isSelected !== n.isSelected) return false;
  if (p.hiLo !== n.hiLo) return false;
  if (p.price === n.price) return true;
  if (!p.price || !n.price) return false;
  return p.price.bid === n.price.bid && p.price.ask === n.price.ask && p.price.mid === n.price.mid;
});
