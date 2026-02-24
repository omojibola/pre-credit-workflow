import { DESK_DV01_LIMIT } from '../../constants/instruments';
import type { LatencyStats } from '../../hooks/useMarketData';

interface Props {
  tickCount: number;
  tradeCount: number;
  sessionDV01: number;
  latency: LatencyStats;
}

export function Header({ tickCount, tradeCount, sessionDV01, latency }: Props) {
  const dv01Pct = Math.min(100, (sessionDV01 / DESK_DV01_LIMIT) * 100);
  const dv01Col =
    dv01Pct > 85 ? '#f87171' : dv01Pct > 65 ? '#fcd34d' : '#4ade80';
  const p99Col =
    latency.p99 < 3 ? '#4ade80' : latency.p99 < 10 ? '#fcd34d' : '#f87171';

  return (
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
        color: '#fff',
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
        LOGO
      </div>
      <span
        style={{
          color: '#fff',
          fontSize: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        Credit Flow · CDS Pre-Trade
      </span>
      <div style={{ flex: 1 }} />

      {/* Session CS01 */}
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
        <span style={{ color: '#1e2530' }}>
          / ${DESK_DV01_LIMIT.toLocaleString()}
        </span>
      </div>

      {/* Latency */}
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
        <span style={{ color: p99Col, fontWeight: 700 }}>●</span>
        <span style={{ color: '#1e2530' }}>
          P50{' '}
          <span style={{ color: '#3a4a5a' }}>{latency.p50.toFixed(2)}ms</span>
        </span>
        <span style={{ color: '#1e2530' }}>
          P99 <span style={{ color: p99Col }}>{latency.p99.toFixed(2)}ms</span>
        </span>
      </div>

      {/* Stats */}
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
          <span style={{ color: '#3a4a5a' }}>{tickCount.toLocaleString()}</span>
        </span>
        <span>
          FILLS <span style={{ color: '#818cf8' }}>{tradeCount}</span>
        </span>
      </div>

      {/* Live indicator */}
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
  );
}
