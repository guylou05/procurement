import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_ORG_COOKIE = "bf_org";

export interface TenantContext {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  role: Role;
  isSuperAdmin: boolean;
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
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const jar = await cookies();
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
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      currency: membership.organization.currency,
      defaultLocale: membership.organization.defaultLocale,
    },
  };
}

/** Returns the org ids a user belongs to — used for the org switcher only. */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}
