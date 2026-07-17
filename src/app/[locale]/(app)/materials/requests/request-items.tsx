"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

/** Dynamic material-request item rows (name[], quantity[], unit[]). */
export function RequestItems() {
  const t = useTranslations("material");
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_5rem_2rem]">
          <Input name="name" placeholder={t("name")} required />
          <Input name="quantity" type="number" min="0" step="any" defaultValue="1" required />
          <Input name="unit" placeholder={t("unit")} defaultValue="unit" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRows((r) => (r.length > 1 ? r.filter((x) => x !== row) : r))}
            aria-label="remove"
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRows((r) => [...r, (r[r.length - 1] ?? 0) + 1])}
      >
        <Plus className="size-4" />
        {t("addItem")}
      </Button>
    </div>
  );
}
