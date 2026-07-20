import type { EmploymentType, WorkerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { toMinor } from "@/lib/money";
import { recordAudit } from "@/server/audit";

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

/**
 * Rich worker profile: the worker, certifications, documents, recent attendance, plus a
 * this-month attendance summary (present/absent/late counts + rate), distinct projects
 * worked, and estimated month-to-date earnings (days present × daily rate). Tenant-scoped.
 */
export async function getWorkerHub(ctx: TenantContext, id: string) {
  const worker = await prisma.worker.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      certifications: { orderBy: { expiresAt: "asc" } },
      documents: { include: { attachment: true }, orderBy: { createdAt: "desc" } },
      attendance: {
        orderBy: { date: "desc" },
        take: 30,
        include: { project: { select: { id: true, name: true } } },
      },
    },
  });
  if (!worker) return null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const monthAttendance = await prisma.attendanceRecord.findMany({
    where: { workerId: id, organizationId: ctx.organizationId, date: { gte: monthStart } },
    select: { status: true, projectId: true },
  });

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, OVERTIME: 0 };
  for (const a of monthAttendance) counts[a.status] += 1;
  const worked = counts.PRESENT + counts.LATE + counts.HALF_DAY + counts.OVERTIME;
  const scheduled = worked + counts.ABSENT;
  const attendanceRate = scheduled > 0 ? Math.round((worked / scheduled) * 100) : 0;
  const daysPresentEquivalent = counts.PRESENT + counts.LATE + counts.OVERTIME + counts.HALF_DAY * 0.5;
  const estEarningsMinor = worker.dailyRateMinor ? Math.round(daysPresentEquivalent * worker.dailyRateMinor) : 0;

  const projectIds = new Set(worker.attendance.map((a) => a.projectId));

  const now = Date.now();
  const soon = now + 30 * 864e5;
  const certStatus = (expiresAt: Date | null) =>
    !expiresAt ? "none" : expiresAt.getTime() < now ? "expired" : expiresAt.getTime() < soon ? "soon" : "valid";

  return {
    worker,
    summary: {
      counts,
      attendanceRate,
      daysWorked: worked,
      estEarningsMinor,
      currency: worker.currency ?? ctx.organization.currency,
      projectsWorked: projectIds.size,
      activeCerts: worker.certifications.filter((c) => certStatus(c.expiresAt) !== "expired").length,
    },
    certifications: worker.certifications.map((c) => ({ ...c, state: certStatus(c.expiresAt) })),
  };
}

export async function updateWorker(
  ctx: TenantContext,
  id: string,
  input: {
    fullName: string;
    jobTitle?: string;
    skill?: string;
    phone?: string;
    email?: string;
    employmentType: EmploymentType;
    status: WorkerStatus;
    dailyRate?: number;
    hireDate?: Date;
    emergencyContact?: string;
    notes?: string;
  },
) {
  const currency = ctx.organization.currency;
  const result = await prisma.worker.updateMany({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    data: {
      fullName: input.fullName.trim(),
      jobTitle: input.jobTitle,
      skill: input.skill,
      phone: input.phone,
      email: input.email,
      employmentType: input.employmentType,
      status: input.status,
      dailyRateMinor: input.dailyRate != null ? toMinor(input.dailyRate, currency) : null,
      hireDate: input.hireDate,
      emergencyContact: input.emergencyContact,
      notes: input.notes,
    },
  });
  if (result.count === 0) throw new Error("Worker not found in organization");
  await recordAudit(ctx, { action: "worker.update", recordType: "Worker", recordId: id });
}

async function assertWorker(ctx: TenantContext, workerId: string) {
  const w = await prisma.worker.findFirst({
    where: { id: workerId, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!w) throw new Error("Worker not found in organization");
}

export async function addCertification(
  ctx: TenantContext,
  workerId: string,
  input: { name: string; issuedAt?: Date; expiresAt?: Date },
) {
  await assertWorker(ctx, workerId);
  return prisma.workerCertification.create({
    data: { workerId, name: input.name.trim(), issuedAt: input.issuedAt, expiresAt: input.expiresAt },
  });
}

export async function removeCertification(ctx: TenantContext, workerId: string, certId: string) {
  await assertWorker(ctx, workerId);
  await prisma.workerCertification.deleteMany({ where: { id: certId, workerId } });
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
