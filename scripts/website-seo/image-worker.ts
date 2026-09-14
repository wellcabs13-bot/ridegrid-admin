import { loadEnvConfig } from "@next/env";

// Run from the project root against the same DB and durable storage volume as
// the web process. One provider request at a time across all worker instances.
async function main() {
  loadEnvConfig(process.cwd());
  const { processNextImage } = await import("../../lib/website-seo/media/ai-image/service");
  const { prisma } = await import("../../lib/prisma");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  try {
    do {
      const job = await processNextImage();
      if (job) console.log(`Image job ${job.id}: ${job.status}${job.error ? ` — ${job.error}` : ""}`);
      if (process.argv.includes("--once")) break;
      if (!job && !stopping) await new Promise(resolve => setTimeout(resolve, 5000));
    } while (!stopping);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Image worker failed."); process.exitCode = 1; });
