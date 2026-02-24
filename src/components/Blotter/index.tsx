import { useRef, useMemo, RefObject } from 'react';
import { BlotterRow } from './BlotterRow';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { ROW_HEIGHT } from '../../constants/instruments';
import type { Instrument, Price, SessionHiLo, SortConfig } from '../../types';

type SortableKey = SortConfig['key'];

interface Column {
  label: string;
  key: SortableKey | 'chg' | 'range';
  align: 'left' | 'right';
  width?: number;
}

const COLUMNS: Column[] = [
  { label: 'INSTRUMENT', key: 'issuer', align: 'left', width: 190 },
  { label: 'SCT', key: 'sector', align: 'left', width: 46 },
  { label: 'RTG', key: 'rating', align: 'left', width: 52 },
  { label: 'TEN', key: 'tenor', align: 'left', width: 40 },
  { label: 'BID', key: 'bid', align: 'right', width: 65 },
  { label: 'MID', key: 'mid', align: 'right', width: 65 },
  { label: 'ASK', key: 'ask', align: 'right', width: 65 },
  { label: 'CHG', key: 'chg', align: 'right', width: 60 },
  { label: 'SESSION RANGE', key: 'range', align: 'left' },
];

interface Props {
  instruments: Instrument[];
  prices: Record<string, Price>;
  sessionHiLo: Record<string, SessionHiLo>;
  selected: Instrument | null;
  sort: SortConfig;
  onSelect: (i: Instrument) => void;
  onSort: (k: SortConfig['key']) => void;
}

export function Blotter({
  instruments,
  prices,
  sessionHiLo,
  selected,
  sort,
  onSelect,
  onSort,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, end, totalH, offsetY } = useVirtualScroll({
    ref: scrollRef as RefObject<HTMLElement | null>,
    itemCount: instruments.length,
    itemHeight: ROW_HEIGHT,
  });
  const visible = useMemo(
    () => instruments.slice(start, end + 1),
    [instruments, start, end],
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        borderRight: '1px solid #0f0f12',
      }}
    >
      {/* Column headers */}
      <div
        style={{
          background: '#08090b',
          borderBottom: '1px solid #111116',
          height: 26,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
        }}
      >
        {COLUMNS.map((c) => {
          const sortable = c.key !== 'chg' && c.key !== 'range';
          return (
            <div
              key={c.key}
              onClick={() => sortable && onSort(c.key as SortConfig['key'])}
              style={{
                width: c.width ?? 'auto',
                flex: c.width ? undefined : 1,
                padding: '0 5px',
                userSelect: 'none',
                cursor: sortable ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                gap: 3,
                color: sort.key === c.key ? '#e2b96b' : '#fff',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                transition: 'color .2s',
              }}
            >
              {c.label}
              {sortable && (
                <span
                  style={{ fontSize: 8, opacity: sort.key === c.key ? 1 : 0.3 }}
                >
                  {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Virtual scroll viewport */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      >
        <div style={{ height: totalH, position: 'relative' }}>
          <div
            style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}
          >
            {visible.map((inst) => (
              <BlotterRow
                key={inst.id}
                instrument={inst}
                price={prices[inst.id] ?? null}
                hiLo={sessionHiLo[inst.id] ?? null}
                isSelected={selected?.id === inst.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#08090b',
          borderTop: '1px solid #0f0f12',
          height: 22,
          display: 'flex',
          alignItems: 'center',
          paddingRight: 12,
          fontSize: 9,
          fontFamily: 'monospace',
          color: '#141820',
          justifyContent: 'flex-end',
        }}
      >
        {end - start + 1}/{instruments.length} RENDERED · VIRTUAL SCROLL · RAF
        BATCH
      </div>
    </div>
  );
}
