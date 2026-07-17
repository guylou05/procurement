import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getTenantContext, type TenantContext } from "@/server/tenant";
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

  // Distinguish "not signed in" from "signed in but has no organization yet".
  const session = await auth();
  if (session?.user?.id) redirect(`/${locale}/onboarding`);
  redirect(`/${locale}/login`);
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
