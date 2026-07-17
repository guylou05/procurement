"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/server/authz";
import { upsertAttendance } from "@/server/services/attendance";

const schema = z.object({
  projectId: z.string().min(1),
  workerId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "OVERTIME"]),
});

export async function saveAttendanceAction(locale: string, formData: FormData): Promise<void> {
  const ctx = await requireAuth(locale);
  requirePermission(ctx, "attendance:record");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await upsertAttendance(ctx, {
    projectId: parsed.data.projectId,
    workerId: parsed.data.workerId,
    date: new Date(parsed.data.date),
    status: parsed.data.status,
    checkInAt: parsed.data.status === "ABSENT" ? undefined : new Date(),
  });

  revalidatePath(`/${locale}/attendance`);
}
