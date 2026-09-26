import { LEGACY_FALLBACK_PAGES } from "./fallback-data";
import { normalizeLegacyPath } from "./validation";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function findLegacyFallbackPage(pathname: string) {
  const normalized = normalizeLegacyPath(pathname);

  if (!normalized) return null;

  return (
    LEGACY_FALLBACK_PAGES.find(
      (page) =>
        normalizeLegacyPath(page.sourcePath) === normalized,
    ) ?? null
  );
}

export function legacyFallbackResponse(
  pathname: string,
): Response | null {
  const page = findLegacyFallbackPage(pathname);

  if (!page) return null;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://www.wellcabs.com";

  const canonical = new URL(
    page.sourcePath,
    base.replace(/\/+$/, "") + "/",
  ).toString();

  const headings = page.headings
    .slice(1)
    .map(
      (heading) =>
        `<h2>${escapeHtml(heading)}</h2>`,
    )
    .join("");

  const paragraphs = page.paragraphs
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<style>
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;line-height:1.7}
header{background:#050505;color:#fff;border-bottom:4px solid #e11d2e;padding:18px 6%}
.brand{font-size:25px;font-weight:800}
.brand span{color:#e11d2e}
main{max-width:1050px;margin:auto;padding:55px 24px}
.badge{display:inline-block;background:#fee2e2;color:#b91c1c;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase}
h1{font-size:42px;line-height:1.1;margin:18px 0}
h2{font-size:25px;margin-top:35px}
p{font-size:17px;color:#3f3f46}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin:35px 0}
.btn{display:inline-block;text-decoration:none;padding:14px 22px;border-radius:9px;font-weight:700}
.primary{background:#e11d2e;color:#fff}
.secondary{background:#111;color:#fff}
.notice{margin-top:45px;padding:20px;border-left:4px solid #e11d2e;background:#fafafa}
footer{margin-top:55px;background:#050505;color:#aaa;padding:28px 6%;text-align:center}
@media(max-width:640px){h1{font-size:32px}}
</style>
</head>
<body data-legacy-fallback="true">
<header>
<div class="brand">Wellcabs <span>× RideGrid</span></div>
</header>

<main>
<span class="badge">New RideGrid Website</span>
<h1>${escapeHtml(page.headings[0] || page.title)}</h1>

<div class="actions">
<a class="btn primary" href="/#ride-search">Search & Book a Cab</a>
<a class="btn secondary" href="/marketplace">Explore Vehicles</a>
</div>

${paragraphs}
${headings}

<div class="notice">
<strong>Website upgrade in progress.</strong>
This page is part of the Wellcabs migration to the new RideGrid platform.
Its fresh route or service experience will replace this temporary legacy page automatically.
</div>
</main>

<footer>Wellcabs powered by RideGrid</footer>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=600",
    },
  });
}