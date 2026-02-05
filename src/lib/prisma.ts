import { PrismaClient } from "@prisma/client";
import { encryptionMiddleware } from "@/lib/prisma/encryption-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // Add PII encryption middleware
  // This automatically encrypts sensitive fields on write and decrypts on read
  client.$use(encryptionMiddleware);

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
