import { describe, it, expect } from "vitest";
import { roleHasPermission, permissionsForRole } from "@/server/permissions";

describe("permission matrix", () => {
  it("grants owners the full org permission set", () => {
    expect(roleHasPermission("OWNER", "org:billing")).toBe(true);
    expect(roleHasPermission("OWNER", "project:create")).toBe(true);
    expect(roleHasPermission("OWNER", "finance:view")).toBe(true);
  });

  it("restricts field workers to a minimal set", () => {
    expect(roleHasPermission("WORKER", "task:complete")).toBe(true);
    expect(roleHasPermission("WORKER", "issue:report")).toBe(true);
    expect(roleHasPermission("WORKER", "finance:view")).toBe(false);
    expect(roleHasPermission("WORKER", "expense:approve")).toBe(false);
    expect(roleHasPermission("WORKER", "project:create")).toBe(false);
  });

  it("lets supervisors submit but not review their own reports", () => {
    expect(roleHasPermission("SUPERVISOR", "report:submit")).toBe(true);
    expect(roleHasPermission("SUPERVISOR", "report:review")).toBe(false);
  });

  it("scopes clients to portal access only", () => {
    expect(permissionsForRole("CLIENT")).toEqual(["portal:access"]);
    expect(roleHasPermission("CLIENT", "project:view")).toBe(false);
  });

  it("keeps accountants out of project creation but in finance", () => {
    expect(roleHasPermission("ACCOUNTANT", "invoice:manage")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "finance:view")).toBe(true);
    expect(roleHasPermission("ACCOUNTANT", "project:create")).toBe(false);
  });
});
