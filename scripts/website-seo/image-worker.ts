import { loadEnvConfig } from "@next/env";

// Run from the project root against the same DB and durable storage volume as
// the web process. One provider request at a time across all worker instances.
async function main() {
  loadEnvConfig(process.cwd());
  const { processNextImage } = await import("../../lib/website-seo/media/ai-image/service");
  const { prisma } = await import("../../lib/prisma");
  let stopping = false;
  let failures = 0;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  try {
    do {
      try {
        const job = await processNextImage(); failures = 0;
        if (job) console.log(`Image job ${job.id}: ${job.status}${job.error ? ` — ${job.error}` : ""}`);
        if (process.argv.includes("--once")) break;
        if (!job && !stopping) await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        if (process.argv.includes("--once")) throw error;
        failures++;
        console.error("Image worker temporarily unavailable. Check database/provider configuration; retrying with backoff.");
        if (!stopping) await new Promise(resolve => setTimeout(resolve, Math.min(60_000, 5000 * 2 ** Math.min(failures - 1, 4))));
      }
    } while (!stopping);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Image worker failed."); process.exitCode = 1; });
