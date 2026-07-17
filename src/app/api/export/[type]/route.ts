import { NextResponse } from "next/server";
import { getTenantContext } from "@/server/tenant";
import { can } from "@/server/authz";
import { buildExport, toCsv } from "@/server/services/report";

const VALID = new Set(["attendance", "expenses", "materials"]);

/**
 * CSV export endpoint. Auth + tenant + permission checked server-side; data is scoped
 * to the caller's organization only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!VALID.has(type)) {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(ctx, "report:export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename, headers, rows } = await buildExport(
    ctx,
    type as "attendance" | "expenses" | "materials",
  );
  const csv = toCsv(headers, rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
