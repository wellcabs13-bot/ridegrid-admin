const fs = require("fs");
const path = require("path");

const roots = [
  "app",
  "components",
  "lib",
  "services",
  "contexts",
  "prisma",
  "scripts",
  "tests"
];

const extensions = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".md", ".mdx", ".txt",
  ".prisma", ".sql"
]);

const skip = new Set([
  "tests/website-seo/public-foundation.test.tsx",
  "tests/website-seo/w16-cutover.test.ts"
]);

const badCodePoints = new Set([
  0x00c2,
  0x00c3,
  0x00e2,
  0x00f0,
  0xfffd
]);

const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) {
        continue;
      }

      walk(full);
      continue;
    }

    if (!extensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const rel = full.split(path.sep).join("/");

    if (skip.has(rel)) {
      continue;
    }

    const text = fs.readFileSync(full, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const ch of line) {
        if (badCodePoints.has(ch.codePointAt(0))) {
          hits.push(`${rel}:${index + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }
}

for (const root of roots) {
  walk(root);
}

if (hits.length) {
  console.error("");
  console.error("ENCODING CHECK FAILED");
  console.error("");

  for (const hit of hits) {
    console.error(hit);
  }

  console.error("");
  console.error(`Suspicious lines: ${hits.length}`);
  process.exit(1);
}

console.log("Encoding check passed: no mojibake detected.");