/**
 * MANDATORY tenant-isolation test (spec §21). Verifies that a user in organization A
 * cannot read organization B's records through the service layer, even when supplying
 * B's record id directly (IDOR attempt).
 *
 * Requires a test PostgreSQL database. Set TEST_DATABASE_URL to enable; otherwise the
 * suite is skipped so CI stays green without a database. Run locally with:
 *   TEST_DATABASE_URL=postgresql://... npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getProject } from "@/server/services/project";
import type { TenantContext } from "@/server/tenant";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("tenant isolation", () => {
  let prisma: PrismaClient;
  let orgAId = "";
  let orgBId = "";
  let orgBProjectId = "";
  let ctxA: TenantContext;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } });
    const orgA = await prisma.organization.create({
      data: { name: "Org A", slug: `a-${Date.now()}`, country: "CM", currency: "XAF" },
    });
    const orgB = await prisma.organization.create({
      data: { name: "Org B", slug: `b-${Date.now()}`, country: "SN", currency: "XOF" },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;
    const projectB = await prisma.project.create({
      data: { organizationId: orgB.id, name: "Secret B", code: "B-1", currency: "XOF" },
    });
    orgBProjectId = projectB.id;

    ctxA = {
      userId: "user-a",
      userName: "A",
      userEmail: "a@a.com",
      organizationId: orgAId,
      role: "OWNER",
      isSuperAdmin: false,
      organization: { id: orgAId, name: "Org A", currency: "XAF", defaultLocale: "en" },
    };
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it("cannot fetch another org's project by id (IDOR)", async () => {
    const result = await getProject(ctxA, orgBProjectId);
    expect(result).toBeNull();
  });
});
