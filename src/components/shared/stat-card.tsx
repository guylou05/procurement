import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * A modern KPI tile: value, label, icon, and an optional period-over-period
 * delta. When `href` is set the whole card links through; when `attention` is
 * set and the value is non-zero the card is highlighted to draw the eye to
 * items that need action (pending approvals, low stock, overdue, …).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  deltaPct,
  deltaGoodWhenDown = false,
  hint,
  attention = false,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  href?: string;
  /** Signed percentage change vs the previous period; null hides the badge. */
  deltaPct?: number | null;
  /** For metrics where a decrease is good (e.g. spend), flips the color. */
  deltaGoodWhenDown?: boolean;
  hint?: string;
  /** Highlight the card when the value is a non-zero count needing action. */
  attention?: boolean;
}) {
  const active = attention && Number(value) > 0;
  const up = (deltaPct ?? 0) > 0;
  const good = deltaPct == null ? false : deltaGoodWhenDown ? !up : up;
  const bad = deltaPct == null || deltaPct === 0 ? false : !good;

  const inner = (
    <div
      className={cn(
        "flex h-full flex-col justify-between rounded-lg border bg-card p-4 transition-colors",
        active && "border-warning/40 bg-warning/5",
        href && "hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <Icon className={cn("size-4 text-muted-foreground", active && "text-warning")} />
        ) : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {deltaPct != null && deltaPct !== 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              good && "bg-success/10 text-success",
              bad && "bg-destructive/10 text-destructive",
            )}
          >
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(deltaPct)}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
