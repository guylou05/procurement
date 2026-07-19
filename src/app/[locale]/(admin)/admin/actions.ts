"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/server/authz";
import { setOrganizationSuspended } from "@/server/services/admin";

const schema = z.object({
  organizationId: z.string().min(1),
  suspended: z.enum(["true", "false"]),
});

export async function setOrganizationSuspendedAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireSuperAdmin(locale);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/admin/organizations?error=validation`);

  await setOrganizationSuspended(
    admin.userId,
    parsed.data.organizationId,
    parsed.data.suspended === "true",
  );

  revalidatePath(`/${locale}/admin/organizations`);
  revalidatePath(`/${locale}/admin/organizations/${parsed.data.organizationId}`);
  revalidatePath(`/${locale}/admin`);
}
