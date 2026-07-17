"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createClient } from "@/server/services/client";

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});

export async function createClientAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "client:manage");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/clients/new?error=validation`);

  await createClient(ctx, {
    name: parsed.data.name,
    company: parsed.data.company,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp,
  });

  revalidatePath(`/${locale}/clients`);
  redirect(`/${locale}/clients`);
}
