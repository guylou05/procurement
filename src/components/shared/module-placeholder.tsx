import { Construction } from "lucide-react";

/**
 * Honest placeholder for modules whose schema, services and navigation exist but whose
 * full UI is not yet built. Deliberately NOT a fake-operational screen — it states the
 * real status so nothing misleads the user (see docs/ROADMAP.md).
 */
export function ModulePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <Construction className="mb-3 size-8 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
