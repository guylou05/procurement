"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

/**
 * Dynamic invoice line-item rows. Each row submits parallel form fields
 * (description[], quantity[], unitPrice[]) which the server action zips back together.
 */
export function InvoiceLineItems({ currency }: { currency: string }) {
  const t = useTranslations("invoice");
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_5rem_7rem_2rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>{t("lineItem")}</span>
        <span>{t("quantity")}</span>
        <span>
          {t("unitPrice")} ({currency})
        </span>
        <span />
      </div>
      {rows.map((row) => (
        <div key={row} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_7rem_2rem]">
          <Input name="description" placeholder={t("lineItem")} required />
          <Input name="quantity" type="number" min="0" step="any" defaultValue="1" required />
          <Input name="unitPrice" type="number" min="0" step="any" defaultValue="0" required />
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
