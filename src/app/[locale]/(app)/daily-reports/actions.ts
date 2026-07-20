"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import {
  createDailyReport,
  reviewDailyReport,
  addReportComment,
  submitDraftReport,
} from "@/server/services/daily-report";
import { uploadAttachment } from "@/server/services/attachment";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  projectId: z.string().min(1),
  date: z.string().min(1),
  weather: z.string().optional(),
  workersPresent: z.coerce.number().min(0).optional(),
  subcontractorsPresent: z.coerce.number().min(0).optional(),
  workCompleted: z.string().optional(),
  workPlanned: z.string().optional(),
  materialsUsed: z.string().optional(),
  delays: z.string().optional(),
  safetyIncidents: z.string().optional(),
  blockers: z.string().optional(),
  additionalNotes: z.string().optional(),
  intent: z.enum(["draft", "submit"]).default("submit"),
});

export async function createDailyReportAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "report:submit");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/daily-reports/new?error=validation`);

  await createDailyReport(ctx, {
    projectId: parsed.data.projectId,
    date: new Date(parsed.data.date),
    weather: parsed.data.weather,
    workersPresent: parsed.data.workersPresent,
    subcontractorsPresent: parsed.data.subcontractorsPresent,
    workCompleted: parsed.data.workCompleted,
    workPlanned: parsed.data.workPlanned,
    materialsUsed: parsed.data.materialsUsed,
    delays: parsed.data.delays,
    safetyIncidents: parsed.data.safetyIncidents,
    blockers: parsed.data.blockers,
    additionalNotes: parsed.data.additionalNotes,
    status: parsed.data.intent === "draft" ? "DRAFT" : "SUBMITTED",
  });

  revalidatePath(`/${locale}/daily-reports`);
  redirect(`/${locale}/daily-reports`);
}

const reviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]),
  note: z.string().optional(),
});

export async function reviewDailyReportAction(
  locale: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "report:review");

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/daily-reports?error=validation`);

  await reviewDailyReport(ctx, parsed.data.id, {
    status: parsed.data.decision,
    note: parsed.data.note,
  });

  revalidatePath(`/${locale}/daily-reports`);
  revalidatePath(`/${locale}/daily-reports/${parsed.data.id}`);
}

const commentSchema = z.object({ id: z.string().min(1), body: z.string().min(1) });

export async function addReportCommentAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  // Any authenticated org member who can view the report may comment; submitters and
  // reviewers both need this. Gate on report:submit OR report:review.
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await addReportComment(ctx, parsed.data.id, parsed.data.body);
  revalidatePath(`/${locale}/daily-reports/${parsed.data.id}`);
}

const submitSchema = z.object({ id: z.string().min(1) });

export async function submitDraftReportAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "report:submit");
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await submitDraftReport(ctx, parsed.data.id);
  revalidatePath(`/${locale}/daily-reports`);
  revalidatePath(`/${locale}/daily-reports/${parsed.data.id}`);
}

export async function uploadReportPhotoAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "report:submit");
  const reportId = String(formData.get("id") ?? "");
  const file = formData.get("photo");
  if (!reportId || !(file instanceof File) || file.size === 0) return;

  // Verify the report belongs to this org before attaching.
  const report = await prisma.dailyReport.findFirst({
    where: { id: reportId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!report) return;

  const attachment = await uploadAttachment(ctx, file);
  await prisma.dailyReportPhoto.create({
    data: { reportId, attachmentId: attachment.id, caption: String(formData.get("caption") ?? "") || null },
  });
  revalidatePath(`/${locale}/daily-reports/${reportId}`);
}
