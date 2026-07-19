"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/server/authz";
import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_ORG_COOKIE,
  IMPERSONATE_COOKIE,
  getTenantContext,
} from "@/server/tenant";

const enterSchema = z.object({ organizationId: z.string().min(1), locale: z.string().default("en") });

/** Super admin begins impersonating an organization ("view as org"). Audited. */
export async function enterImpersonationAction(formData: FormData): Promise<void> {
  const admin = await requireSuperAdmin();
  const parsed = enterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/en/admin/organizations`);

  const org = await prisma.organization.findFirst({
    where: { id: parsed.data.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!org) redirect(`/${parsed.data.locale}/admin/organizations`);

  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  // Clear any active-org cookie so impersonation is unambiguous.
  jar.delete(ACTIVE_ORG_COOKIE);

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: admin.userId,
      action: "platform.impersonation.start",
      recordType: "Organization",
      recordId: org.id,
      newValue: { impersonatorEmail: admin.userEmail },
    },
  });

  redirect(`/${parsed.data.locale}/dashboard`);
}

const exitSchema = z.object({ locale: z.string().default("en") });

/** Ends an impersonation session and returns the super admin to the admin panel. */
export async function exitImpersonationAction(formData: FormData): Promise<void> {
  const parsed = exitSchema.safeParse(Object.fromEntries(formData));
  const locale = parsed.success ? parsed.data.locale : "en";

  const session = await auth();
  const jar = await cookies();

  // Best-effort audit before we can no longer resolve the impersonated context.
  const ctx = await getTenantContext();
  if (ctx?.impersonating && session?.user?.id) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: session.user.id,
        action: "platform.impersonation.stop",
        recordType: "Organization",
        recordId: ctx.organizationId,
      },
    });
  }

  jar.delete(IMPERSONATE_COOKIE);
  redirect(`/${locale}/admin`);
}
