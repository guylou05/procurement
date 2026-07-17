"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { createInvitation, revokeInvitation } from "@/server/services/team";
import { recordAudit } from "@/server/audit";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "ADMIN",
    "PROJECT_MANAGER",
    "SUPERVISOR",
    "WORKER",
    "ACCOUNTANT",
    "CLIENT",
  ]),
});

export type InviteState = { token?: string; error?: string };

export async function inviteMemberAction(
  locale: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "org:members");

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "validation" };

  const { token } = await createInvitation(ctx, parsed.data);
  await recordAudit(ctx, {
    action: "member.invite",
    recordType: "Invitation",
    newValue: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath(`/${locale}/team`);
  return { token };
}

export async function revokeInvitationAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "org:members");
  const id = String(formData.get("id") ?? "");
  if (id) await revokeInvitation(ctx, id);
  revalidatePath(`/${locale}/team`);
}
