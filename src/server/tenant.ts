import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_ORG_COOKIE = "bf_org";
export const IMPERSONATE_COOKIE = "bf_impersonate";

export interface TenantContext {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  role: Role;
  isSuperAdmin: boolean;
  /** True when a platform super admin is viewing this org via impersonation. */
  impersonating: boolean;
  organization: {
    id: string;
    name: string;
    currency: string;
    defaultLocale: string;
  };
}

/**
 * Resolves the authenticated user's active tenant context. The organization is
 * derived from the session + a server-set cookie and ALWAYS validated against a
 * real membership row. Organization IDs supplied by the client are never trusted.
 * Returns null when there is no session or no valid membership.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const jar = await cookies();

    // Impersonation: only a platform super admin may enter an org they don't belong
    // to. The target org id lives in a server-set httpOnly cookie and the super-admin
    // flag is read from the verified session — never trusted from the client. The
    // resolved context is flagged `impersonating` so the UI can surface a banner.
    const impersonateOrgId = jar.get(IMPERSONATE_COOKIE)?.value;
    if (impersonateOrgId && session.user.isSuperAdmin) {
      const org = await prisma.organization.findFirst({
        where: { id: impersonateOrgId, deletedAt: null },
      });
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (org && admin) {
        return {
          userId,
          userName: admin.name ?? admin.email,
          userEmail: admin.email,
          organizationId: org.id,
          role: "OWNER",
          isSuperAdmin: true,
          impersonating: true,
          organization: {
            id: org.id,
            name: org.name,
            currency: org.currency,
            defaultLocale: org.defaultLocale,
          },
        };
      }
    }

    const requestedOrgId = jar.get(ACTIVE_ORG_COOKIE)?.value;

    // Validate membership: the requested org must be one the user actually belongs to.
    const membership = requestedOrgId
      ? await prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: requestedOrgId, userId } },
          include: { organization: true, user: true },
        })
      : await prisma.organizationMember.findFirst({
          where: { userId },
          include: { organization: true, user: true },
          orderBy: { createdAt: "asc" },
        });

    if (!membership || membership.organization.deletedAt) return null;

    return {
      userId,
      userName: membership.user.name ?? membership.user.email,
      userEmail: membership.user.email,
      organizationId: membership.organizationId,
      role: membership.role,
      isSuperAdmin: session!.user.isSuperAdmin,
      impersonating: false,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        currency: membership.organization.currency,
        defaultLocale: membership.organization.defaultLocale,
      },
    };
  } catch (err) {
    // Logged raw, server-side, before Next's production redaction can strip it —
    // this is the one place a Server-Component render error still has its real
    // message and stack by the time it reaches a log line.
    console.error("[getTenantContext] failed:", err);
    throw err;
  }
}

/** Returns the org ids a user belongs to — used for the org switcher only. */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * True if the user's only membership(s) point at a suspended organization. Used to
 * distinguish "never created a company" (-> onboarding) from "your company was
 * suspended" (-> a clear notice) so a suspended member is never nudged into creating
 * a duplicate organization.
 */
export async function hasOnlySuspendedMemberships(userId: string): Promise<boolean> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organization: { select: { deletedAt: true } } },
  });
  if (memberships.length === 0) return false;
  return memberships.every((m) => m.organization.deletedAt !== null);
}
