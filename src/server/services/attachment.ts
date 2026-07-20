import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/server/tenant";
import { getStorage, buildObjectKey, validateUpload } from "@/lib/storage";

/**
 * Attachment service. Uploads go through the configured storage driver (S3-compatible
 * or local disk) and are recorded as FileAttachment rows scoped to the organization.
 * Every read is tenant-scoped so one org can never fetch another's files.
 */

const EMPTY = "No file provided";

export async function uploadAttachment(ctx: TenantContext, file: File) {
  if (!file || file.size === 0) throw new Error(EMPTY);
  const bytes = Buffer.from(await file.arrayBuffer());
  validateUpload(file.type, bytes.byteLength);

  const key = buildObjectKey(ctx.organizationId, file.name);
  await getStorage().put({ key, body: bytes, contentType: file.type });

  return prisma.fileAttachment.create({
    data: {
      organizationId: ctx.organizationId,
      key,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: bytes.byteLength,
      uploadedById: ctx.userId,
    },
  });
}

export async function getAttachmentForOrg(organizationId: string, id: string) {
  return prisma.fileAttachment.findFirst({ where: { id, organizationId } });
}
