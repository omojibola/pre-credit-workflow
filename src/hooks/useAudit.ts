import { useState, useRef, useCallback } from 'react';
import { AUDIT_MAX_ENTRIES } from '../constants/instruments';
import { nowTs } from '../utils/formatters';
import type { AuditEntry, AuditEventType } from '../types';

const INITIAL_ENTRIES: AuditEntry[] = [
  { time: nowTs(), type: 'SYSTEM', msg: 'Credit Flow Platform initialised' },
  {
    time: nowTs(),
    type: 'SYSTEM',
    msg: 'Market data: CONNECTED (Solace MQ) · 80 instruments',
  },
  {
    time: nowTs(),
    type: 'SYSTEM',
    msg: 'RFQ Engine: READY · CS01 limit $250,000',
  },
];

export function useAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>(INITIAL_ENTRIES);
  const ref = useRef<AuditEntry[]>([...INITIAL_ENTRIES]);

  const pushAudit = useCallback(
    (type: AuditEventType | string, msg: string) => {
      const entry: AuditEntry = {
        time: nowTs(),
        type: type as AuditEventType,
        msg,
      };
      ref.current = [...ref.current.slice(-(AUDIT_MAX_ENTRIES - 1)), entry];
      setEntries([...ref.current]);
    },
    [],
  );

  return { auditEntries: entries, pushAudit };
}
