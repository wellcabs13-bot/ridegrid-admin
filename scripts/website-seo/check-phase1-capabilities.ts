import fs from "node:fs";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
async function main() {
  const originalError = console.error;
  console.error = () => {}; // Do not expose connection diagnostics or credentials.
  try {
    const { GET } = await import("../../app/api/marketplace/options/route");
    const response = await GET();
    const result = await response.json();
    const rows = Array.isArray(result.data) ? result.data : [];
    const snapshot = { checkedAt: new Date().toISOString(), httpStatus: response.status, source: "/api/marketplace/options", toursConfigured: result.toursConfigured === true,
      // Public search dimensions only. No rate IDs, vendor data, fares or customer data.
      options: rows.map((r: Record<string, unknown>) => ({ service: r.service, city: r.city, fromCity: r.fromCity, toCity: r.toCity, vehicleCategory: r.vehicleCategory, packageName: r.packageName })),
      note: "Read-only observation, not a guarantee of date-specific availability. Search and checkout revalidate centrally." };
    fs.writeFileSync("data/seo/phase1-capabilities.json", JSON.stringify(snapshot, null, 2) + "\n");
    const { WebsitePageRepository } = await import("../../lib/website-seo/pages/repository");
    const published = await new WebsitePageRepository().list({ status: "PUBLISHED" });
    fs.writeFileSync("data/seo/phase1-existing-public-pages.json", JSON.stringify(published.map(page => ({ pathname: page.pathname, family: page.entity.type, entity: page.entity.name, slug: page.entity.slug })), null, 2) + "\n");
    console.log(JSON.stringify({ httpStatus: response.status, publicOptions: rows.length, toursConfigured: snapshot.toursConfigured }));
  } finally { console.error = originalError; const { prisma } = await import("../../lib/prisma"); await prisma.$disconnect(); }
}
main().catch(() => { console.log("Capability read unavailable; no changes made to the database."); process.exitCode = 1; });
