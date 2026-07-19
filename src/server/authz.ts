import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import {
  getTenantContext,
  hasOnlySuspendedMemberships,
  type TenantContext,
} from "@/server/tenant";
import { roleHasPermission, type Permission } from "@/server/permissions";

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** True if the context's role grants the permission (super admins bypass org perms). */
export function can(ctx: TenantContext, permission: Permission): boolean {
  if (ctx.isSuperAdmin && permission.startsWith("platform:")) return true;
  return roleHasPermission(ctx.role, permission);
}

/**
 * Server guard for pages/layouts: returns the tenant context or redirects to login.
 * Every authenticated page begins with this.
 */
export async function requireAuth(locale = "en"): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx) return ctx;

  // Distinguish "not signed in" from "signed in but has no organization yet". A pure
  // platform super admin (no organization membership) belongs in the admin panel, not
  // the "create your company" onboarding flow. A member whose only organization(s)
  // were suspended must see a clear notice, never the onboarding form — otherwise
  // they could be nudged into creating a duplicate organization.
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.isSuperAdmin) redirect(`/${locale}/admin`);
    if (await hasOnlySuspendedMemberships(session.user.id)) {
      redirect(`/${locale}/suspended`);
    }
    redirect(`/${locale}/onboarding`);
  }
  redirect(`/${locale}/login`);
}

export interface SuperAdminContext {
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Server guard for the platform admin panel. Independent of tenant/organization
 * membership — a super admin does not need to belong to any organization. Regular
 * users (including org owners) are redirected to their dashboard, never told the
 * admin panel exists.
 */
export async function requireSuperAdmin(locale = "en"): Promise<SuperAdminContext> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  if (!session.user.isSuperAdmin) redirect(`/${locale}/dashboard`);

  return {
    userId: session.user.id,
    userName: session.user.name ?? session.user.email ?? "",
    userEmail: session.user.email ?? "",
  };
}

/**
 * Server guard for mutations: throws AuthorizationError if the permission is missing.
 * Every server action calls this AFTER requireAuth and BEFORE touching data.
 */
export function requirePermission(ctx: TenantContext, permission: Permission): void {
  if (!can(ctx, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
