import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../auth/password";
import { DEFAULT_DEPARTMENTS } from "../modules/departments/default-departments";

type BootstrapOptions = {
  SEED_OWNER_EMAIL?: string;
  SEED_OWNER_PASSWORD?: string;
  SEED_OWNER_NAME?: string;
  SEED_WORKSPACE_NAME?: string;
};

/** Initialize a new installation only. Existing installations are never repaired or reseeded. */
export async function bootstrapInstallation(prisma: PrismaClient, options: BootstrapOptions = {}) {
  return prisma.$transaction(async (tx) => {
    // Serialize bootstrap containers and concurrent registration before checking emptiness.
    // PostgreSQL releases these locks on commit/rollback, including after a process crash.
    await tx.$executeRaw`LOCK TABLE users, workspaces IN SHARE ROW EXCLUSIVE MODE`;
    if (await tx.user.count() || await tx.workspace.count()) return "skipped" as const;

    const owner = await tx.user.create({
      data: {
        email: (options.SEED_OWNER_EMAIL ?? "owner@owner.com").trim().toLowerCase(),
        name: options.SEED_OWNER_NAME ?? "Owner",
        passwordHash: await hashPassword(options.SEED_OWNER_PASSWORD ?? "password")
      }
    });
    const workspace = await tx.workspace.create({
      data: {
        name: options.SEED_WORKSPACE_NAME ?? "Roost",
        ownerUserId: owner.id,
        memberships: { create: { userId: owner.id, role: "owner" } }
      }
    });
    // Twelve company departments plus the required 00 General navigation surface.
    await tx.workspaceDepartment.createMany({
      data: DEFAULT_DEPARTMENTS.map((department) => ({
        ...department,
        linkedViews: [...department.linkedViews],
        workspaceId: workspace.id,
        isSystem: true
      }))
    });
    return "created" as const;
  }, { timeout: 30_000 });
}
