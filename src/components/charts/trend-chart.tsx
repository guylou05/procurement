import type { TrendPoint } from "@/server/services/admin";

/**
 * Compact, dependency-free area+line trend chart rendered as inline SVG on the server.
 * Uses a single accent color, a soft gradient fill and a subtle baseline — readable in
 * both light and dark themes via currentColor / theme tokens.
 */
export function TrendChart({
  data,
  title,
  subtitle,
  accent = "hsl(var(--primary))",
  format,
  total: totalOverride,
}: {
  data: TrendPoint[];
  title: string;
  subtitle?: string;
  accent?: string;
  /** Formats the header total (e.g. as currency). Defaults to a plain number. */
  format?: (n: number) => string;
  /**
   * Overrides the header figure. Defaults to the sum of all points, which is right
   * for per-period series; pass the last value for a cumulative/running-total series.
   */
  total?: number;
}) {
  const width = 320;
  const height = 90;
  const pad = 4;
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const totalValue = totalOverride ?? values.reduce((a, b) => a + b, 0);
  const total = format ? format(totalValue) : String(totalValue);
  const last = values[values.length - 1] ?? 0;

  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = data.map((d, i) => [pad + i * stepX, y(d.value)] as const);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${points[points.length - 1]?.[0] ?? pad},${height - pad} L${pad},${height - pad} Z`;
  const gradId = `grad-${title.replace(/\W/g, "")}`;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}: latest ${last}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === points.length - 1 ? 3 : 0}
            fill={accent}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
