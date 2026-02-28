/** Format a number with comma separators */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format a percentage to 2 decimal places */
export function formatPercent(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

/** Format availability as percentage with appropriate precision */
export function formatAvailability(n: number): string {
  if (n >= 0.99999) return "99.999%";
  if (n >= 0.9999) return (n * 100).toFixed(3) + "%";
  if (n >= 0.999) return (n * 100).toFixed(2) + "%";
  return (n * 100).toFixed(1) + "%";
}

/** Format latency in ms */
export function formatLatency(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms >= 1000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms) + "ms";
}

/** Format cost as USD */
export function formatCost(usd: number): string {
  return "$" + usd.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Format throughput */
export function formatThroughput(rps: number): string {
  if (rps >= 1000000) return (rps / 1000000).toFixed(1) + "M req/s";
  if (rps >= 1000) return (rps / 1000).toFixed(1) + "K req/s";
  return rps + " req/s";
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Lerp between two numbers */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
