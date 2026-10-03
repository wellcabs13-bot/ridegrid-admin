import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadEnvConfig } from "@next/env";
import { imageProvider, imageEnvironment } from "../../lib/website-seo/media/ai-image/provider";
import { passesImageReview, reviewGeneratedImage, type ImageReview } from "../../lib/website-seo/media/ai-image/quality";
import { ImageEngineError } from "../../lib/website-seo/media/ai-image/types";
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
interface Job { pageId: string; priority: string; imageIntent: string; imagePrompt: string; altText: string; assetPath: string; status: string; attempts: number; error?: string; review?: ImageReview; width?: number; height?: number; bytes?: number }
const file = "data/seo/phase1-image-manifest.json";
const jobs: Job[] = JSON.parse(fs.readFileSync(file, "utf8"));
const save = () => { fs.writeFileSync(file + ".tmp", JSON.stringify(jobs, null, 2) + "\n"); fs.renameSync(file + ".tmp", file); };
async function main() {
  const output = path.resolve("public/media/phase1"); fs.mkdirSync(output, { recursive: true });
  // Single worker lock: no accidental duplicate generation or concurrent spend.
  const lockPath = path.join(output, ".batch.lock");
  const lock = fs.openSync(lockPath, "wx");
  try {
    const config = imageEnvironment();
    if (config.error) throw new ImageEngineError(config.error);
    const provider = imageProvider(); // Reuse the existing provider, model, timeout and spend policy.
    const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
    const limit = limitArg ? Number(limitArg.split("=")[1]) : 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 408) throw new ImageEngineError("Batch limit must be between 1 and 408.");
    const pending = jobs.filter(j => ["PENDING", "BLOCKED_PROVIDER"].includes(j.status)).sort((a, b) => a.priority.localeCompare(b.priority)).slice(0, limit);
    for (const job of pending) {
      for (; job.attempts < 3;) {
        job.attempts++; job.status = "PROCESSING"; save();
        console.log(JSON.stringify({ pageId: job.pageId, attempt: job.attempts }));
        try {
          const image = await provider.generate({ prompt: job.imagePrompt, model: config.model, size: "1536x1024", quality: config.quality });
          const review = await reviewGeneratedImage(image.content, job.imageIntent); job.review = review;
          if (!passesImageReview(review)) { job.status = "REJECTED"; job.error = review.reason; save(); continue; }
          const filename = `${job.pageId.toLowerCase()}.webp`;
          const buffer = await sharp(image.content).resize(1200, 800, { fit: "cover" }).webp({ quality: 78 }).toBuffer();
          fs.writeFileSync(path.join(output, filename), buffer);
          Object.assign(job, { status: "APPROVED", assetPath: `/media/phase1/${filename}`, width: 1200, height: 800, bytes: buffer.length, error: undefined });
          save(); break;
        } catch (error) {
          const message = error instanceof ImageEngineError ? error.message : "Provider or optimization failed; check provider usage before resuming.";
          // A quota/auth/ambiguous network error must not trigger hundreds of requests.
          for (const remaining of pending.filter(j => ["PROCESSING", "PENDING", "BLOCKED_PROVIDER"].includes(j.status))) { remaining.status = "BLOCKED_PROVIDER"; remaining.error = message; }
          save(); console.log(message); return;
        }
      }
      if (job.status !== "APPROVED") { job.status = "FAILED_QUALITY"; job.error = "Three visual reviews failed. No approved relevant fallback is available; retain the non-photographic layout."; save(); }
    }
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}
main().catch(error => { console.log(error instanceof ImageEngineError ? error.message : `Image batch stopped (${typeof error?.code === "string" ? error.code : "unknown error"}); pending jobs are retained.`); process.exitCode = 1; });
