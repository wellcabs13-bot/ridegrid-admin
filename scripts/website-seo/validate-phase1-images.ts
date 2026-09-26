import fs from "node:fs";
import assert from "node:assert/strict";
import sharp from "sharp";
import images from "../../data/seo/phase1-image-manifest.json";
import { passesImageReview } from "../../lib/website-seo/media/ai-image/quality";
async function main() {
  assert.equal(images.length, 408);
  assert.equal(new Set(images.map(i => i.pageId)).size, 408);
  let bytes = 0;
  for (const image of images) {
    assert.ok(image.altText && image.imagePrompt && /^[ABC]$/.test(image.priority));
    if (image.status !== "APPROVED") continue;
    assert.ok(passesImageReview((image as { review?: unknown }).review), image.pageId);
    assert.match(image.assetPath, /^\/media\/phase1\/rg-p1-\d+\.webp$/);
    const file = `public${image.assetPath}`, meta = await sharp(file).metadata();
    assert.equal(meta.format, "webp"); assert.equal(meta.width, 1200); assert.equal(meta.height, 800);
    const size = fs.statSync(file).size; assert.ok(size < 300000, `Oversized hero: ${image.pageId}`); bytes += size;
  }
  const counts = Object.fromEntries([...new Set(images.map(i => i.status))].map(state => [state, images.filter(i => i.status === state).length]));
  fs.writeFileSync("docs/website-seo/phase1-qa/images.json", JSON.stringify({ checkedAt: new Date().toISOString(), counts, approvedBytes: bytes, pass: true }, null, 2) + "\n");
  console.log(JSON.stringify({ counts, approvedBytes: bytes }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
