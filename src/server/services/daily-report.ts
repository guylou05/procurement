import type { DailyReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Daily site report service — tenant-scoped. */

export async function listDailyReports(ctx: TenantContext) {
  return prisma.dailyReport.findMany({
    where: { organizationId: ctx.organizationId },
    include: { project: { select: { name: true, code: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getDailyReport(ctx: TenantContext, id: string) {
  return prisma.dailyReport.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      project: true,
      photos: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createDailyReport(
  ctx: TenantContext,
  input: {
    projectId: string;
    date: Date;
    weather?: string;
    workersPresent?: number;
    subcontractorsPresent?: number;
    workCompleted?: string;
    workPlanned?: string;
    materialsUsed?: string;
    delays?: string;
    safetyIncidents?: string;
    blockers?: string;
    additionalNotes?: string;
    status: DailyReportStatus;
  },
) {
  // Validate the project belongs to this tenant before writing.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found in organization");

  return prisma.dailyReport.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId,
      supervisorId: ctx.userId,
      date: input.date,
      weather: input.weather,
      workersPresent: input.workersPresent ?? 0,
      subcontractorsPresent: input.subcontractorsPresent ?? 0,
      workCompleted: input.workCompleted,
      workPlanned: input.workPlanned,
      materialsUsed: input.materialsUsed,
      delays: input.delays,
      safetyIncidents: input.safetyIncidents,
      blockers: input.blockers,
      additionalNotes: input.additionalNotes,
      status: input.status,
      submittedAt: input.status === "SUBMITTED" ? new Date() : null,
    },
  });
}

export async function reviewDailyReport(
  ctx: TenantContext,
  id: string,
  decision: { status: DailyReportStatus; note?: string },
) {
  // Scoped update: matches id AND organizationId so cross-tenant review is impossible.
  const result = await prisma.dailyReport.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: {
      status: decision.status,
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewNote: decision.note,
    },
  });
  if (result.count === 0) throw new Error("Report not found in organization");
}

export async function pendingReportCount(ctx: TenantContext) {
  return prisma.dailyReport.count({
    where: { organizationId: ctx.organizationId, status: "SUBMITTED" },
  });
}

/**
 * Full report for the detail page: content, photos, comments (with resolved author
 * names), plus supervisor and reviewer. Tenant-scoped.
 */
export async function getDailyReportDetail(ctx: TenantContext, id: string) {
  const report = await prisma.dailyReport.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      project: { select: { id: true, name: true, code: true } },
      supervisor: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
      photos: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) return null;

  // DailyReportComment stores authorId only; resolve display names in one query.
  const authorIds = [...new Set(report.comments.map((c) => c.authorId))];
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const authorName = new Map(authors.map((a) => [a.id, a.name ?? a.email]));

  return {
    report,
    comments: report.comments.map((c) => ({
      ...c,
      authorName: authorName.get(c.authorId) ?? "—",
    })),
  };
}

export async function addReportComment(ctx: TenantContext, reportId: string, body: string) {
  const report = await prisma.dailyReport.findFirst({
    where: { id: reportId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!report) throw new Error("Report not found in organization");
  return prisma.dailyReportComment.create({
    data: { reportId, authorId: ctx.userId, body: body.trim() },
  });
}

/** Submits a DRAFT report for review (author action). */
export async function submitDraftReport(ctx: TenantContext, id: string) {
  const result = await prisma.dailyReport.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "DRAFT" },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  if (result.count === 0) throw new Error("Draft report not found in organization");
}
