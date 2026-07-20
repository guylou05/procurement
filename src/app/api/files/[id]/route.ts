import { NextResponse } from "next/server";
import { getTenantContext } from "@/server/tenant";
import { getAttachmentForOrg } from "@/server/services/attachment";
import { getStorage } from "@/lib/storage";

/**
 * Serves an uploaded file by attachment id. Always tenant-scoped: the attachment must
 * belong to the caller's active organization, so one org can never read another's
 * files. For the s3 driver we redirect to a short-lived signed URL; for local we stream
 * the bytes from disk. Never cached publicly.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getTenantContext();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const att = await getAttachmentForOrg(ctx.organizationId, id);
  if (!att) return new NextResponse("Not found", { status: 404 });

  const storage = getStorage();
  if (storage.driver === "s3") {
    const url = await storage.getSignedUrl(att.key);
    return NextResponse.redirect(url);
  }

  const bytes = await storage.read!(att.key);
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename="${att.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
