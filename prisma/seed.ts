import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const key = process.env.SEED_API_KEY ?? "dev-companycore-key";

  await prisma.apiKey.upsert({
    where: { key },
    update: { active: true },
    create: {
      name: "Local development key",
      key,
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
