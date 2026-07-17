import type { EmploymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";

/** Worker/workforce service — tenant-scoped. Workers may exist without a user account. */

export async function listWorkers(ctx: TenantContext) {
  return prisma.worker.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { fullName: "asc" },
  });
}

export async function getWorker(ctx: TenantContext, id: string) {
  return prisma.worker.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      certifications: true,
      documents: true,
      attendance: { orderBy: { date: "desc" }, take: 30 },
    },
  });
}

export async function createWorker(
  ctx: TenantContext,
  input: {
    fullName: string;
    workerId: string;
    jobTitle?: string;
    skill?: string;
    phone?: string;
    email?: string;
    employmentType: EmploymentType;
    dailyRate?: number;
    hireDate?: Date;
    emergencyContact?: string;
  },
) {
  const currency = ctx.organization.currency;
  return prisma.worker.create({
    data: {
      organizationId: ctx.organizationId,
      fullName: input.fullName.trim(),
      workerId: input.workerId.trim(),
      jobTitle: input.jobTitle,
      skill: input.skill,
      phone: input.phone,
      email: input.email,
      employmentType: input.employmentType,
      currency,
      dailyRateMinor: input.dailyRate ? toMinor(input.dailyRate, currency) : null,
      hireDate: input.hireDate,
      emergencyContact: input.emergencyContact,
    },
  });
}
