/** Format a number to fixed decimal places, or return "—" for null/undefined. */
export const f2 = (n: number | null | undefined, d = 2): string =>
  n != null ? Number(n).toFixed(d) : "—";

/** Current time as HH:MM:SS (24h). */
export const nowTs = (): string =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });

/** Calculate CS01/DV01: Notional × 0.0001 × tenorYears */
export const calcDV01 = (notional: number, tenor: string): number =>
  Math.round(notional * 0.0001 * parseFloat(tenor));
