import { useState, useMemo, useRef, useCallback } from 'react';
import { Blotter } from './components/Blotter';
import { RFQPanel } from './components/RFQPanel';
import { CreditCurve } from './components/CreditCurve';
import { AuditLog } from './components/AuditLog';
import { TradeBlotter } from './components/TradeBlotter';
import { DealerScorecard } from './components/DealerScorecard';
import { MarketAssistant } from './components/MarketAssistant';
import { useMarketData } from './hooks/useMarketData';
import { useRFQ } from './hooks/useRFQ';
import { useAudit } from './hooks/useAudit';
import { useMarketAssistant } from './hooks/useMarketAssistant';
import { INSTRUMENTS } from './constants/instruments';
import { calcDV01 } from './utils/formatters';
import type {
  Instrument,
  Trade,
  SortConfig,
  SortKey,
  BottomTab,
  AssistantContext,
} from './types';

const GLOBAL_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap");
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #070809; }
  ::-webkit-scrollbar-thumb { background: #181820; border-radius: 2px; }
  input::placeholder { color: #1a2030; }
  textarea::placeholder { color: #2a3040; }
  input[type=range] { -webkit-appearance: none; height: 3px; background: #181820; border-radius: 2px; outline: none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #e2b96b; cursor: pointer; }
  button:hover { filter: brightness(1.12); }
`;

const SECTOR_BG: Record<string, string> = {
  TMT: '#1e1b3a',
  FIN: '#0e2233',
  NRG: '#2a1f0e',
  HLT: '#0e2a1a',
  UTL: '#1e1a2e',
  IND: '#1e1e1e',
  MTL: '#1a1a2e',
  CST: '#2a1a1e',
  INS: '#1a2a2e',
  MDI: '#2a2a1e',
};
const SECTOR_FG: Record<string, string> = {
  TMT: '#818cf8',
  FIN: '#38bdf8',
  NRG: '#fb923c',
  HLT: '#4ade80',
  UTL: '#a78bfa',
  IND: '#94a3b8',
  MTL: '#c084fc',
  CST: '#fb7185',
  INS: '#22d3ee',
  MDI: '#fbbf24',
};

export default function App() {
  const { mkt, latency } = useMarketData();
  const { auditEntries, pushAudit } = useAudit();
  const assistant = useMarketAssistant();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortConfig>({ key: 'issuer', dir: 'asc' });
  const [bottomTab, setBottomTab] = useState<BottomTab>('audit');
  const [replayTrade, setReplay] = useState<Trade | null>(null);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionDV01 = useMemo(
    () =>
      trades.reduce(
        (acc, t) => acc + calcDV01(t.notional, t.instrument.tenor),
        0,
      ),
    [trades],
  );

  const onFill = useCallback((trade: Trade) => {
    setTrades((prev) => [...prev, trade]);
    setBottomTab('trades');
  }, []);

  const { rfqState, scorecard, sendRFQ, acceptQuote, newRFQ } = useRFQ({
    pushAudit,
    onFill,
  });

  // Build assistant context from live state (re-computed on each render so it's always fresh)
  const assistantCtx: AssistantContext = useMemo(
    () => ({
      selected,
      prices: mkt.prices,
      sessionHiLo: mkt.sessionHiLo,
      trades,
      rfqState,
      scorecard,
      sessionDV01,
      tickCount: mkt.tickCount,
    }),
    [
      selected,
      mkt.prices,
      mkt.sessionHiLo,
      mkt.tickCount,
      trades,
      rfqState,
      scorecard,
      sessionDV01,
    ],
  );

  const handleSelect = useCallback(
    (inst: Instrument) => {
      setSelected(inst);
      pushAudit(
        'INSTRUMENT_SELECT',
        `${inst.id} · ${inst.issuer} · ${inst.rating}`,
      );
    },
    [pushAudit],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      setSort((prev) => {
        const dir = prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc';
        pushAudit('SORT', `col=${key} dir=${dir}`);
        return { key, dir };
      });
    },
    [pushAudit],
  );

  const handleFilter = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (filterTimer.current) clearTimeout(filterTimer.current);
      filterTimer.current = setTimeout(() => {
        setFilter(value);
        if (value) pushAudit('FILTER', `query="${value}"`);
      }, 120);
    },
    [pushAudit],
  );

  const filteredSorted = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const rows = q
      ? INSTRUMENTS.filter(
          (i) =>
            i.issuer.toLowerCase().includes(q) ||
            i.ticker.toLowerCase().includes(q) ||
            i.sector.toLowerCase().includes(q) ||
            i.rating.toLowerCase().includes(q) ||
            i.id.toLowerCase().includes(q),
        )
      : INSTRUMENTS;
    const { key, dir } = sort;
    const m = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: number | string, bv: number | string;
      if (['bid', 'ask', 'mid', 'spread'].includes(key)) {
        const pa = mkt.prices[a.id];
        const pb = mkt.prices[b.id];

        if (key === 'spread') {
          av = pa ? pa.ask - pa.bid : 999;
          bv = pb ? pb.ask - pb.bid : 999;
        } else {
          const k = key as 'bid' | 'ask' | 'mid';
          av = pa ? pa[k] : 999;
          bv = pb ? pb[k] : 999;
        }
      } else {
        const k = key as 'issuer' | 'sector' | 'rating' | 'tenor';
        av = a[k] ?? '';
        bv = b[k] ?? '';
      }
      return av < bv ? -m : av > bv ? m : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort.key, sort.dir, mkt.tickCount]);

  const TABS: Array<{
    id: BottomTab;
    label: string;
    count: number;
    color: string;
  }> = [
    {
      id: 'audit',
      label: 'AUDIT LOG',
      count: auditEntries.length,
      color: '#38bdf8',
    },
    {
      id: 'trades',
      label: 'TRADE BLOTTER',
      count: trades.length,
      color: '#818cf8',
    },
    {
      id: 'dealers',
      label: 'DEALER SCORECARD',
      count: Object.keys(scorecard).length,
      color: '#e2b96b',
    },
  ];

  return (
    <div
      style={{
        background: '#070809',
        color: '#b8bec8',
        fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* HEADER — with AI toggle button */}
      <div
        style={{
          background: '#08090b',
          borderBottom: '1px solid #0f0f12',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: '#0066cc',
            color: '#fff',
            fontWeight: 900,
            fontSize: 11,
            padding: '3px 8px',
            letterSpacing: 0.5,
            borderRadius: 2,
          }}
        >
          DB
        </div>
        <span
          style={{
            color: '#2e3545',
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Credit Flow · CDS Pre-Trade
        </span>
        <div style={{ flex: 1 }} />

        {/* Session CS01 gauge */}
        {(() => {
          const dv01Pct = Math.min(100, (sessionDV01 / 250_000) * 100);
          const dv01Col =
            dv01Pct > 85 ? '#f87171' : dv01Pct > 65 ? '#fcd34d' : '#4ade80';
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: 'monospace',
                fontSize: 10,
                background: '#0c0d0f',
                border: `1px solid ${dv01Col}22`,
                borderRadius: 3,
                padding: '4px 10px',
              }}
            >
              <span style={{ color: '#1e2530' }}>SESSION CS01</span>
              <div
                style={{
                  width: 52,
                  height: 3,
                  background: '#141418',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${dv01Pct}%`,
                    background: dv01Col,
                    borderRadius: 2,
                    transition: 'width .5s',
                  }}
                />
              </div>
              <span style={{ color: dv01Col, fontWeight: 600 }}>
                ${sessionDV01.toLocaleString()}
              </span>
            </div>
          );
        })()}

        {/* Latency */}
        {(() => {
          const p99c =
            latency.p99 < 3
              ? '#4ade80'
              : latency.p99 < 10
                ? '#fcd34d'
                : '#f87171';
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontFamily: 'monospace',
                fontSize: 10,
                background: '#0c0d0f',
                border: '1px solid #141418',
                borderRadius: 3,
                padding: '4px 10px',
              }}
            >
              <span style={{ color: p99c, fontWeight: 700 }}>●</span>
              <span style={{ color: '#1e2530' }}>
                P99{' '}
                <span style={{ color: p99c }}>{latency.p99.toFixed(1)}ms</span>
              </span>
            </div>
          );
        })()}

        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#1e2530',
            display: 'flex',
            gap: 10,
          }}
        >
          <span>
            TICKS{' '}
            <span style={{ color: '#3a4a5a' }}>
              {mkt.tickCount.toLocaleString()}
            </span>
          </span>
          <span>
            FILLS <span style={{ color: '#818cf8' }}>{trades.length}</span>
          </span>
        </div>

        {/* AI Assistant toggle */}
        <button
          onClick={() =>
            assistant.isOpen ? assistant.close() : assistant.open()
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            background: assistant.isOpen
              ? 'rgba(226,185,107,.12)'
              : 'transparent',
            border: `1px solid ${assistant.isOpen ? '#e2b96b44' : '#1e2530'}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: assistant.isOpen ? '#e2b96b' : '#3a4a5a',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.8,
            transition: 'all .2s',
          }}
        >
          <svg
            width='12'
            height='12'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
          </svg>
          AI ASSISTANT
          {assistant.messages.length > 0 && (
            <span
              style={{
                background: '#e2b96b22',
                color: '#e2b96b',
                fontSize: 8,
                padding: '1px 5px',
                borderRadius: 8,
              }}
            >
              {assistant.messages.length}
            </span>
          )}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 7px #4ade80',
            }}
          />
          <span style={{ color: '#4ade80', fontWeight: 700 }}>LIVE</span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div
        style={{
          background: '#08090b',
          borderBottom: '1px solid #0d0d10',
          height: 33,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <svg
          width='11'
          height='11'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#252b38'
          strokeWidth='2'
        >
          <circle cx='11' cy='11' r='8' />
          <path d='m21 21-4.35-4.35' />
        </svg>
        <input
          onChange={handleFilter}
          placeholder='Filter issuer, ticker, sector, rating…'
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#4a5468',
            fontSize: 12,
            width: 280,
            fontFamily: 'inherit',
          }}
        />
        <div style={{ flex: 1 }} />
        {['FIN', 'TMT', 'NRG', 'HLT', 'UTL'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter((f) => (f === s ? '' : s))}
            style={{
              background: filter === s ? SECTOR_BG[s] : 'transparent',
              border: `1px solid ${filter === s ? SECTOR_FG[s] : '#141418'}`,
              color: filter === s ? SECTOR_FG[s] : '#1e2530',
              fontSize: 9,
              padding: '2px 7px',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div
        style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}
      >
        <Blotter
          instruments={filteredSorted}
          prices={mkt.prices}
          sessionHiLo={mkt.sessionHiLo}
          selected={selected}
          sort={sort}
          onSelect={handleSelect}
          onSort={handleSort}
        />

        {/* Right panel: RFQ + Credit Curve */}
        <div
          style={{
            width: 318,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderLeft: '1px solid #0f0f12',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <RFQPanel
              instrument={selected}
              price={selected ? (mkt.prices[selected.id] ?? null) : null}
              rfqState={rfqState}
              sessionDV01={sessionDV01}
              onSendRFQ={sendRFQ}
              onAccept={acceptQuote}
              onNewRFQ={newRFQ}
            />
          </div>
          {selected && (
            <div style={{ flexShrink: 0 }}>
              <CreditCurve instrument={selected} prices={mkt.prices} />
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TABS */}
      <div
        style={{
          height: 230,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderTop: '1px solid #0f0f12',
        }}
      >
        <div
          style={{
            background: '#08090b',
            borderBottom: '1px solid #0f0f12',
            height: 27,
            display: 'flex',
            alignItems: 'stretch',
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBottomTab(tab.id)}
              style={{
                padding: '0 16px',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  bottomTab === tab.id
                    ? `2px solid ${tab.color}`
                    : '2px solid transparent',
                color: bottomTab === tab.id ? tab.color : '#1e2530',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 2,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'color .15s',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  style={{
                    background: `${tab.color}18`,
                    color: tab.color,
                    padding: '1px 5px',
                    borderRadius: 8,
                    fontSize: 8,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingRight: 12,
              fontSize: 9,
              fontFamily: 'monospace',
              color: '#141820',
            }}
          >
            {filteredSorted.length}/{INSTRUMENTS.length} SHOWN · VIRTUAL · RAF
          </div>
        </div>
        <div
          style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}
        >
          {bottomTab === 'audit' && <AuditLog entries={auditEntries} />}
          {bottomTab === 'trades' && (
            <TradeBlotter
              trades={trades}
              history={mkt.history}
              prices={mkt.prices}
              replayTrade={replayTrade}
              onSelectReplay={setReplay}
              onCloseReplay={() => setReplay(null)}
            />
          )}
          {bottomTab === 'dealers' && <DealerScorecard scorecard={scorecard} />}
        </div>
      </div>

      {/* AI ASSISTANT — slide-in overlay */}
      <MarketAssistant
        messages={assistant.messages}
        isLoading={assistant.isLoading}
        isOpen={assistant.isOpen}
        ctx={assistantCtx}
        onSend={assistant.sendMessage}
        onClose={assistant.close}
        onClear={assistant.clearHistory}
      />
    </div>
  );
}
