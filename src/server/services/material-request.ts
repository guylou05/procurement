import type { MaterialRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";

/** Material request workflow service — tenant-scoped. */

export async function listMaterialRequests(ctx: TenantContext) {
  return prisma.materialRequest.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      project: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createMaterialRequest(
  ctx: TenantContext,
  input: {
    projectId?: string;
    note?: string;
    items: { name: string; quantity: number; unit: string }[];
    submit: boolean;
  },
): Promise<{ id: string } | { error: "NO_ITEMS" }> {
  const items = input.items.filter((i) => i.name.trim() && i.quantity > 0);
  if (items.length === 0) return { error: "NO_ITEMS" };

  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!project) throw new Error("Project not found in organization");
  }

  const request = await prisma.materialRequest.create({
    data: {
      organizationId: ctx.organizationId,
      projectId: input.projectId || null,
      requestedById: ctx.userId,
      note: input.note,
      status: input.submit ? "SUBMITTED" : "DRAFT",
      items: {
        create: items.map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit || "unit",
        })),
      },
    },
  });
  return { id: request.id };
}

export async function setMaterialRequestStatus(
  ctx: TenantContext,
  id: string,
  status: MaterialRequestStatus,
) {
  const result = await prisma.materialRequest.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { status },
  });
  if (result.count === 0) throw new Error("Request not found in organization");
}
