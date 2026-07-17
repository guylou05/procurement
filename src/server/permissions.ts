import type { Role } from "@prisma/client";

/**
 * Granular permissions. Roles map to permission sets here; the mapping is the
 * single source of truth mirrored by docs/PERMISSION_MATRIX.md. Custom roles can
 * later be introduced by persisting per-role permission sets without schema changes.
 */
export const PERMISSIONS = [
  "org:manage",
  "org:billing",
  "org:members",
  "org:roles",
  "org:audit",
  "platform:manage",
  "platform:impersonate",
  "project:create",
  "project:view",
  "project:assign",
  "worker:manage",
  "attendance:record",
  "attendance:correct",
  "report:submit",
  "report:review",
  "task:manage",
  "task:complete",
  "material:manage",
  "material:request",
  "material:approve",
  "expense:record",
  "expense:approve",
  "equipment:manage",
  "issue:report",
  "issue:resolve",
  "client:manage",
  "invoice:manage",
  "finance:view",
  "report:export",
  "portal:access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  SUPER_ADMIN: new Set<Permission>([
    "platform:manage",
    "platform:impersonate",
  ]),
  OWNER: ALL,
  ADMIN: new Set<Permission>([
    "org:manage",
    "org:members",
    "org:roles",
    "org:audit",
    "project:create",
    "project:view",
    "project:assign",
    "worker:manage",
    "attendance:record",
    "attendance:correct",
    "report:submit",
    "report:review",
    "task:manage",
    "task:complete",
    "material:manage",
    "material:request",
    "material:approve",
    "expense:record",
    "expense:approve",
    "equipment:manage",
    "issue:report",
    "issue:resolve",
    "client:manage",
    "invoice:manage",
    "finance:view",
    "report:export",
  ]),
  PROJECT_MANAGER: new Set<Permission>([
    "project:create",
    "project:view",
    "project:assign",
    "worker:manage",
    "attendance:record",
    "attendance:correct",
    "report:submit",
    "report:review",
    "task:manage",
    "task:complete",
    "material:manage",
    "material:request",
    "material:approve",
    "expense:record",
    "expense:approve",
    "equipment:manage",
    "issue:report",
    "issue:resolve",
    "client:manage",
    "finance:view",
    "report:export",
  ]),
  SUPERVISOR: new Set<Permission>([
    "project:view",
    "attendance:record",
    "attendance:correct",
    "report:submit",
    "task:manage",
    "task:complete",
    "material:request",
    "material:manage",
    "expense:record",
    "equipment:manage",
    "issue:report",
    "issue:resolve",
  ]),
  WORKER: new Set<Permission>(["project:view", "task:complete", "issue:report"]),
  ACCOUNTANT: new Set<Permission>([
    "project:view",
    "expense:record",
    "expense:approve",
    "invoice:manage",
    "finance:view",
    "report:export",
  ]),
  CLIENT: new Set<Permission>(["portal:access"]),
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function permissionsForRole(role: Role): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}
