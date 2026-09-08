import { PrismaClient } from "@prisma/client";
import { bootstrapInstallation } from "../src/bootstrap/installation";

const prisma = new PrismaClient();

bootstrapInstallation(prisma, process.env)
  .then((result) => console.log(result === "created"
    ? "Installation initialized: owner, workspace and departments."
    : "Installation already exists; bootstrap skipped without data changes."))
  .catch(() => {
    console.error("Installation bootstrap failed; transaction rolled back.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
