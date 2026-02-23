export interface Instrument {
  id: string;
  issuer: string;
  ticker: string;
  sector: string;
  rating: string;
  tenor: string;
  baseMid: number;
}

export interface Price {
  bid: number;
  ask: number;
  mid: number;
  prevBid: number | null;
  prevAsk: number | null;
  prevMid: number | null;
  bidFlash: -1 | 0 | 1;
  askFlash: -1 | 0 | 1;
  midFlash: -1 | 0 | 1;
  ts: number;
}

export interface RawPrice {
  bid: number;
  ask: number;
  mid: number;
  ts: number;
}

export interface PriceHistoryPoint {
  t: string;
  mid: number;
  bid: number;
  ask: number;
}

export interface SessionHiLo {
  hi: number;
  lo: number;
  open: number;
}

export interface Dealer {
  id: string;
  name: string;
  color: string;
  responseRate: number;
  speedMs: [number, number];
  axisBias: number;
}

export type QuoteStatus = "PENDING" | "QUOTED" | "DECLINED" | "FILLED" | "PASSED" | "EXPIRED";
export type RFQStatus   = "PENDING" | "QUOTED" | "FILLED" | "EXPIRED";
export type TradeSide   = "BUY" | "SELL";

export interface DealerQuote {
  dealerId: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  status: QuoteStatus;
  responseMs?: number;
}

export interface RFQState {
  id: string;
  instrument: Instrument;
  side: TradeSide;
  notional: number;
  midAtRequest: number | null;
  dealerIds: string[];
  status: RFQStatus;
  sentAt: number;
  quotes: DealerQuote[];
  fillPrice: number | null;
  filledDealerId: string | null;
  slippage: number | null;
  coverPrice: number | null;
  filledAt?: string;
}

export interface IncomingQuote {
  dealerId: string;
  bid: number;
  ask: number;
  mid: number;
  responseMs: number;
}

export interface Trade {
  id: string;
  instrument: Instrument;
  side: TradeSide;
  notional: number;
  fillPrice: number;
  midAtRequest: number;
  slippage: number;
  filledAt: string;
  dealer: string;
  coverPrice: number | null;
}

export type AuditEventType =
  | "SYSTEM"
  | "RFQ_SENT"
  | "QUOTE_RECEIVED"
  | "DEALER_DECLINED"
  | "TRADE_FILLED"
  | "QUOTE_EXPIRED"
  | "PASS_SENT"
  | "INSTRUMENT_SELECT"
  | "FILTER"
  | "SORT"
  | "BEST_EXECUTION";

export interface AuditEntry {
  time: string;
  type: AuditEventType;
  msg: string;
}

export interface DealerStats {
  sent: number;
  responded: number;
  wins: number;
  totalSpread: number;
  totalResponseMs: number;
}

export type Scorecard = Record<string, DealerStats>;

export type SortKey = "issuer" | "sector" | "rating" | "tenor" | "bid" | "ask" | "mid" | "spread";
export type SortDir = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  dir: SortDir;
}

export type BottomTab = "audit" | "trades" | "dealers";

export interface MarketState {
  prices: Record<string, Price>;
  history: Record<string, PriceHistoryPoint[]>;
  sessionHiLo: Record<string, SessionHiLo>;
  tickCount: number;
}

export interface BatchItem {
  id: string;
  data: RawPrice;
}

export type MarketAction = { type: "BATCH"; items: BatchItem[] };

// ─── Market Assistant ─────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id:        string;
  role:      ChatRole;
  content:   string;
  ts:        string;
  isStreaming?: boolean;
}

export interface AssistantContext {
  selected:    Instrument | null;
  prices:      Record<string, Price>;
  sessionHiLo: Record<string, SessionHiLo>;
  trades:      Trade[];
  rfqState:    RFQState | null;
  scorecard:   Scorecard;
  sessionDV01: number;
  tickCount:   number;
}
