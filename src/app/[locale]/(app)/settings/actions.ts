"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { updateOrganization, updateUserLocale } from "@/server/services/settings";
import { recordAudit } from "@/server/audit";

const orgSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  industry: z.string().optional(),
  approvalThreshold: z.coerce.number().min(0),
  requireReportApproval: z.enum(["on"]).optional(),
});

export async function updateOrganizationAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "org:manage");

  const parsed = orgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await updateOrganization(ctx, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    address: parsed.data.address,
    industry: parsed.data.industry,
    approvalThreshold: parsed.data.approvalThreshold,
    requireReportApproval: parsed.data.requireReportApproval === "on",
  });
  await recordAudit(ctx, {
    action: "organization.update",
    recordType: "Organization",
    recordId: ctx.organizationId,
  });

  revalidatePath(`/${locale}/settings`);
}

const localeSchema = z.object({ locale: z.enum(["en", "fr"]) });

export async function updateLocaleAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  const parsed = localeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateUserLocale(ctx, parsed.data.locale);
  revalidatePath(`/${locale}/settings`);
}
