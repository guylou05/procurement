import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor, toMajor } from "@/lib/money";

/** Organization & user settings service — tenant-scoped. */

export async function getOrgWithSettings(ctx: TenantContext) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    include: { settings: true },
  });
  if (!org) throw new Error("Organization not found");
  return {
    org,
    // Expose the approval threshold in major units for the form.
    approvalThresholdMajor: toMajor(
      org.settings?.expenseApprovalThreshold ?? 0,
      org.currency,
    ),
  };
}

export async function updateOrganization(
  ctx: TenantContext,
  input: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    industry?: string;
    approvalThreshold: number;
    requireReportApproval: boolean;
  },
) {
  const thresholdMinor = toMinor(input.approvalThreshold, ctx.organization.currency);
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: ctx.organizationId },
      data: {
        name: input.name.trim(),
        phone: input.phone,
        email: input.email,
        address: input.address,
        industry: input.industry,
      },
    }),
    prisma.organizationSetting.upsert({
      where: { organizationId: ctx.organizationId },
      update: {
        expenseApprovalThreshold: thresholdMinor,
        requireReportApproval: input.requireReportApproval,
      },
      create: {
        organizationId: ctx.organizationId,
        expenseApprovalThreshold: thresholdMinor,
        requireReportApproval: input.requireReportApproval,
      },
    }),
  ]);
}

export async function updateUserLocale(ctx: TenantContext, locale: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: ctx.userId }, data: { locale } }),
    prisma.userPreference.upsert({
      where: { userId: ctx.userId },
      update: { locale },
      create: { userId: ctx.userId, locale },
    }),
  ]);
}
