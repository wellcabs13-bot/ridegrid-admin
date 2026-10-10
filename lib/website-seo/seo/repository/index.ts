import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeWebsiteKeyword } from "../../keywords/normalize";
import type { SeoPlan } from "../types";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export class WebsiteSeoPlanRepository {
  async duplicateMetadata(pageId: string, title: string, description: string) {
    const rows = await prisma.websiteSeoPage.findMany({ where: { id: { not: pageId }, OR: [
      { metadata: { path: ["seoW6", "normalizedTitle"], equals: normalizeWebsiteKeyword(title) } },
      { metadata: { path: ["seoW6", "normalizedDescription"], equals: normalizeWebsiteKeyword(description) } },
    ] }, select: { metadata: true } });
    return { duplicateTitle: !!title && rows.some(r => object(object(r.metadata).seoW6).normalizedTitle === normalizeWebsiteKeyword(title)),
      duplicateDescription: !!description && rows.some(r => object(object(r.metadata).seoW6).normalizedDescription === normalizeWebsiteKeyword(description)) };
  }

  async persist(plan: SeoPlan, revision: Date) {
    return prisma.$transaction(async tx => {
      const page = await tx.websiteSeoPage.findUnique({ where: { id: plan.page.id } });
      if (!page || page.entityId !== plan.entity.id || page.templateId !== plan.page.templateId) return { status: "SKIPPED", reason: "Page mapping changed." } as const;
      const metadata = object(page.metadata);
      const previous = object(metadata.seoW6);
      if (["PUBLISHED", "ARCHIVED"].includes(page.status) || metadata.seo !== undefined || metadata.seoOverrides !== undefined ||
        metadata.manuallyEdited === true || metadata.approvedAt !== undefined || ["APPROVED", "PUBLISHED"].includes(String(metadata.editorialStatus))) {
        return { status: "SKIPPED", reason: "Published/manual/editorial SEO is protected." } as const;
      }
      if (metadata.seoW6 !== undefined) {
        if (previous.engine === "W6" && previous.ownership === "GENERATED_DRAFT" && previous.fingerprint === plan.generation.fingerprint) {
          return { status: "UNCHANGED", pageId: page.id } as const;
        }
        return { status: "SKIPPED", reason: "Existing SEO requires explicit editorial replacement." } as const;
      }
      if (page.updatedAt.getTime() !== revision.getTime()) return { status: "SKIPPED", reason: "Page changed; generate a fresh preview." } as const;
      const stored = JSON.parse(JSON.stringify({ ...metadata, seoW6: { engine: "W6", ownership: "GENERATED_DRAFT",
        fingerprint: plan.generation.fingerprint, normalizedTitle: normalizeWebsiteKeyword(plan.metadata.title),
        normalizedDescription: normalizeWebsiteKeyword(plan.metadata.description), plan } })) as Prisma.InputJsonObject;
      await tx.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: stored } });
      return { status: "SAVED", pageId: page.id } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
export const websiteSeoPlanRepository = new WebsiteSeoPlanRepository();
