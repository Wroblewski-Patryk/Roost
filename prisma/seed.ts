import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

const prisma = new PrismaClient();

async function main() {
  const key = process.env.SEED_API_KEY ?? "dev-companycore-key";
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "change-me-local-password";
  const workspaceName = process.env.SEED_WORKSPACE_NAME ?? "LuckySparrow";

  const passwordHash = await hashPassword(ownerPassword);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "Local owner",
      passwordHash
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "00000000-0000-4000-8000-000000000100" },
    update: {
      name: workspaceName,
      ownerUserId: owner.id
    },
    create: {
      id: "00000000-0000-4000-8000-000000000100",
      name: workspaceName,
      ownerUserId: owner.id
    }
  });

  await prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: owner.id
      }
    },
    update: { role: "owner" },
    create: {
      workspaceId: workspace.id,
      userId: owner.id,
      role: "owner"
    }
  });

  await prisma.apiKey.upsert({
    where: { key },
    update: { active: true, workspaceId: workspace.id },
    create: {
      name: "Local development key",
      key,
      workspaceId: workspace.id,
      active: true
    }
  });

  const stages = ["Lead", "Qualified", "Proposal", "Won"];
  for (const [position, name] of stages.entries()) {
    await prisma.pipelineStage.upsert({
      where: { id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}` },
      update: { name, position },
      create: {
        id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}`,
        name,
        position
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
