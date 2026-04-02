import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not configured. Database features disabled.");
    return null;
  }

  // Parse the URL to extract connection parameters
  const url = new URL(databaseUrl);
  console.log(`[Prisma] Connecting to ${url.hostname}:${url.port || "3306"} db=${url.pathname.slice(1)} user=${url.username}`);

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    connectionLimit: 5,
    connectTimeout: 30000,
    acquireTimeout: 30000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}
