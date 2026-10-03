import { loadEnvConfig } from "@next/env";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextRequest } from "next/server";

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("../../lib/prisma");
  const { syncRealEntities, loadRealCandidates } = await import("../../lib/website-seo/entities/real-sync");
  const { dryRun } = await import("../../lib/website-seo/scale/candidates");
  const report: Record<string, unknown> = { checkedAt: new Date().toISOString(), mode: process.argv.includes("--sync") ? "REAL_ENTITY_SYNC_ONLY" : "READ_ONLY", providerCalls: 0, published: 0 };
  try {
    report.entities = await syncRealEntities({ dryRun: !process.argv.includes("--sync"), actor: "website-seo-completion" });
    if (process.argv.includes("--prepare-pilot")) {
      const { prepareRealPilot } = await import("../../lib/website-seo/scale/real-pilot");
      try { report.preparedPilot = await prepareRealPilot("website-seo-completion"); }
      catch (error) { report.preparedPilot = { blocked: error instanceof Error ? error.message : "Pilot preparation failed." }; }
    }
    const source = await loadRealCandidates();
    const pilot = source.candidates.filter(c => c.type === "ROUTE").slice(0,10);
    report.pilot10 = pilot.length ? (await dryRun(pilot)).map(p => ({ key: p.key, eligible: p.eligible, reasons: p.reasons })) : [];
    report.templates = await prisma.websiteSeoTemplate.groupBy({ by: ["entityType","status"], _count: true });
    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true, role: true } });
    const jwt = await import("jsonwebtoken");
    const token = admin && process.env.JWT_SECRET ? jwt.default.sign(admin, process.env.JWT_SECRET, { expiresIn: "5m" }) : "";
    const modules = ["health","entities","pages","templates","homepage","content-blocks","public-navigation","media","media/ai-images","search-intelligence/overview","performance/overview","automation","ai-control"];
    const results: Record<string, unknown>[] = [];
    for (const route of modules) {
      try {
        const module = await import(pathToFileURL(path.resolve(`app/api/website-seo/${route}/route.ts`)).href);
        const request = new NextRequest(`http://localhost/api/website-seo/${route}`, { headers: { cookie: `ridegrid_access_token=${token}` } });
        const response = await module.GET(request);
        results.push({ route, status: response.status, result: response.ok ? "PASS" : "BLOCKED" });
      } catch { results.push({ route, result: "BLOCKED", reason: "Handler or database unavailable; inspect server configuration." }); }
    }
    report.readApiChecks = results;
  } catch { report.blocker = "Database/source validation could not complete. No paid generation or publication was requested."; }
  finally { await prisma.$disconnect(); }
  await mkdir("docs/website-seo", { recursive: true });
  await writeFile("docs/website-seo/completion-validation.json", JSON.stringify(report,null,2) + "\n");
  console.log(JSON.stringify(report,null,2));
}
main().catch(() => { console.error("Website completion verification failed."); process.exitCode = 1; });
