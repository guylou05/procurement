"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createInvitation,
  revokeInvitation,
  updateMemberRole,
  removeMember,
} from "@/server/services/team";
import { recordAudit } from "@/server/audit";

const ROLES = ["OWNER", "ADMIN", "PROJECT_MANAGER", "SUPERVISOR", "WORKER", "ACCOUNTANT", "CLIENT"] as const;

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

const roleSchema = z.object({ id: z.string().min(1), role: z.enum(ROLES) });

export async function updateMemberRoleAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "org:members");
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateMemberRole(ctx, parsed.data.id, parsed.data.role);
  await recordAudit(ctx, { action: "member.role", recordType: "OrganizationMember", recordId: parsed.data.id, newValue: { role: parsed.data.role } });
  revalidatePath(`/${locale}/team`);
}

export async function removeMemberAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "org:members");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await removeMember(ctx, id);
    await recordAudit(ctx, { action: "member.remove", recordType: "OrganizationMember", recordId: id });
  }
  revalidatePath(`/${locale}/team`);
}
