/**
 * Ring-buffer latency tracker.
 * Records end-to-end message latency samples and exposes P50/P99.
 */
export class LatencyTracker {
  private buf: Float32Array;
  private pos = 0;
  private count = 0;
  private readonly size: number;

  constructor(size = 300) {
    this.size = size;
    this.buf = new Float32Array(size);
  }

  record(ms: number): void {
    this.buf[this.pos] = ms;
    this.pos = (this.pos + 1) % this.size;
    this.count = Math.min(this.count + 1, this.size);
  }

  private sorted(): number[] {
    return Array.from(this.buf.subarray(0, this.count)).sort((a, b) => a - b);
  }

  p50(): number {
    if (!this.count) return 0;
    const s = this.sorted();
    return s[Math.floor(s.length * 0.5)] ?? 0;
  }

  p99(): number {
    if (!this.count) return 0;
    const s = this.sorted();
    return s[Math.floor(s.length * 0.99)] ?? 0;
  }

  last(): number {
    return this.buf[(this.pos - 1 + this.size) % this.size];
  }
}
