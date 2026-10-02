import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Serverless URLs often pin connection_limit=1, which serialises every query in a
// function instance; fan-out routes (admin dashboard, reports) then exhaust the
// 10s pool timeout. Keep a small pool per instance against the transaction pooler.
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const limit = Number(process.env.DATABASE_CONNECTION_LIMIT ?? 5);
    if (Number(url.searchParams.get("connection_limit") ?? 0) < limit) url.searchParams.set("connection_limit", String(limit));
    if (Number(url.searchParams.get("pool_timeout") ?? 0) < 20) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

const prisma =
  global.prisma ||
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export { prisma };
export default prisma;
