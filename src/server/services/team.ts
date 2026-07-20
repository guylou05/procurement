import { randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Team & invitation service — tenant-scoped. */

const INVITE_TTL_DAYS = 14;

export async function listMembers(ctx: TenantContext) {
  return prisma.organizationMember.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/** Changes a member's role. Refuses to demote the organization's last owner. */
export async function updateMemberRole(ctx: TenantContext, memberId: string, role: Role) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.organizationId },
    select: { id: true, role: true },
  });
  if (!member) throw new Error("Member not found in organization");

  if (member.role === "OWNER" && role !== "OWNER") {
    const owners = await prisma.organizationMember.count({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
    });
    if (owners <= 1) throw new Error("Cannot demote the last owner");
  }

  await prisma.organizationMember.update({ where: { id: memberId }, data: { role } });
}

/** Removes a member. Refuses to remove the last owner. */
export async function removeMember(ctx: TenantContext, memberId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.organizationId },
    select: { id: true, role: true },
  });
  if (!member) throw new Error("Member not found in organization");

  if (member.role === "OWNER") {
    const owners = await prisma.organizationMember.count({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
    });
    if (owners <= 1) throw new Error("Cannot remove the last owner");
  }

  await prisma.organizationMember.deleteMany({
    where: { id: memberId, organizationId: ctx.organizationId },
  });
}

export async function listInvitations(ctx: TenantContext) {
  return prisma.invitation.findMany({
    where: { organizationId: ctx.organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function createInvitation(
  ctx: TenantContext,
  input: { email: string; role: Role },
): Promise<{ token: string }> {
  const email = input.email.toLowerCase().trim();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5);

  await prisma.invitation.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      role: input.role,
      token,
      expiresAt,
      status: "PENDING",
    },
  });
  // MVP: no email transport wired — the caller surfaces the link to share manually.
  return { token };
}

export async function revokeInvitation(ctx: TenantContext, id: string) {
  await prisma.invitation.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "PENDING" },
    data: { status: "REVOKED" },
  });
}

/** Public (pre-tenant) lookup used by the accept-invite page. */
export async function getInvitationByToken(token: string) {
  const invite = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) return null;
  return invite;
}

/**
 * Accepts an invitation for the given user. Validates the token and (case-insensitively)
 * that the invite email matches the accepting user's email, then creates the membership.
 */
export async function acceptInvitation(
  token: string,
  user: { id: string; email: string },
): Promise<{ organizationId: string } | { error: "INVALID" | "EMAIL_MISMATCH" }> {
  const invite = await getInvitationByToken(token);
  if (!invite) return { error: "INVALID" };
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "EMAIL_MISMATCH" };
  }

  await prisma.$transaction([
    prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: invite.organizationId, userId: user.id },
      },
      update: { role: invite.role },
      create: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
    }),
    prisma.invitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } }),
  ]);

  return { organizationId: invite.organizationId };
}
