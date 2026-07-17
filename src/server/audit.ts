import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

interface AuditInput {
  action: string;
  recordType: string;
  recordId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

/** Records a sensitive change to the tenant-scoped audit log. */
export async function recordAudit(ctx: TenantContext, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: input.action,
      recordType: input.recordType,
      recordId: input.recordId,
      previousValue: input.previousValue as never,
      newValue: input.newValue as never,
      ipAddress: input.ipAddress,
    },
  });
}
