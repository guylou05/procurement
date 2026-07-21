/**
 * Shared weekly-bucketing helpers for time-series analytics. Buckets are computed
 * in JS from raw dates (no Postgres date_trunc) so they stay database-agnostic and
 * easy to unit test, and missing weeks are filled with 0 for a continuous series.
 */

export interface TrendPoint {
  label: string; // short week label, e.g. "Feb 12"
  value: number;
}

/** Start-of-week (Monday, UTC) for a date. */
export function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - day);
  return x;
}

/** A dense array of the last `weeks` weekly buckets, oldest first, all zeroed. */
export function weeklyBuckets(weeks: number): { start: number; label: string; value: number }[] {
  const thisWeek = startOfWeek(new Date());
  const buckets: { start: number; label: string; value: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setUTCDate(start.getUTCDate() - i * 7);
    buckets.push({
      start: start.getTime(),
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: 0,
    });
  }
  return buckets;
}

/** Sums `amount(row)` into the weekly bucket that contains `date(row)`. */
export function bucketBy<T>(
  rows: T[],
  date: (r: T) => Date,
  amount: (r: T) => number,
  weeks: number,
): TrendPoint[] {
  const buckets = weeklyBuckets(weeks);
  for (const r of rows) {
    const ws = startOfWeek(date(r)).getTime();
    const b = buckets.find((x) => x.start === ws);
    if (b) b.value += amount(r);
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}

/** Turns a per-period series into a running total (for burn-down / cumulative views). */
export function cumulative(points: TrendPoint[]): TrendPoint[] {
  let running = 0;
  return points.map((p) => {
    running += p.value;
    return { label: p.label, value: running };
  });
}
