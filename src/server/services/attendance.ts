import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { recordAudit } from "@/server/audit";

/** Attendance service — tenant-scoped, with audited corrections. */

export async function listWorkersForProject(ctx: TenantContext, projectId: string) {
  // Ensure the project is in-tenant.
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) return [];
  return prisma.worker.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE", deletedAt: null },
    orderBy: { fullName: "asc" },
  });
}

export async function getAttendanceForDay(ctx: TenantContext, projectId: string, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.attendanceRecord.findMany({
    where: {
      organizationId: ctx.organizationId,
      projectId,
      date: { gte: start, lt: end },
    },
  });
}

export async function upsertAttendance(
  ctx: TenantContext,
  input: {
    projectId: string;
    workerId: string;
    date: Date;
    status: AttendanceStatus;
    checkInAt?: Date;
    latitude?: number;
    longitude?: number;
  },
) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found in organization");

  const day = new Date(input.date);
  day.setHours(0, 0, 0, 0);

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      projectId_workerId_date: {
        projectId: input.projectId,
        workerId: input.workerId,
        date: day,
      },
    },
  });

  if (existing) {
    // Editing an existing record is a correction — audit it.
    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        checkInAt: input.checkInAt ?? existing.checkInAt,
        correctedById: ctx.userId,
        correctedAt: new Date(),
      },
    });
    await recordAudit(ctx, {
      action: "attendance.correct",
      recordType: "AttendanceRecord",
      recordId: existing.id,
      previousValue: { status: existing.status },
      newValue: { status: input.status },
    });
    return updated;
  }

  return prisma.attendanceRecord.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      workerId: input.workerId,
      date: day,
      status: input.status,
      checkInAt: input.checkInAt,
      latitude: input.latitude,
      longitude: input.longitude,
      recordedById: ctx.userId,
    },
  });
}

export async function workersOnSiteToday(ctx: TenantContext) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return prisma.attendanceRecord.count({
    where: {
      organizationId: ctx.organizationId,
      date: { gte: start, lt: end },
      status: { in: ["PRESENT", "LATE", "OVERTIME", "HALF_DAY"] },
    },
  });
}
