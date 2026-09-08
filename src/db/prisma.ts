import { PrismaClient } from "@prisma/client";
import { installRuntimeRedaction } from "../modules/agent-runtime/runtime-redaction-data";

export const prisma = new PrismaClient();
installRuntimeRedaction(prisma);
