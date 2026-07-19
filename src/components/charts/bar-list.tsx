/**
 * Horizontal bar list — a compact ranking chart (e.g. top organizations). Each row is a
 * label + value with a proportional bar. Server-rendered, no client JS.
 */
export function BarList({
  items,
}: {
  items: { label: string; value: number; hint?: string; href?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="ml-2 shrink-0 text-muted-foreground">
              {item.value}
              {item.hint ? ` ${item.hint}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
