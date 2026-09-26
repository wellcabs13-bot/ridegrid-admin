import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContentResult } from "../types";
import { copyFingerprint } from "../quality";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export class WebsiteContentRepository {
  async hasDuplicateCopy(fingerprint: string, pageId: string | null) {
    return !!await prisma.websiteSeoPage.findFirst({ where: {
      ...(pageId ? { id: { not: pageId } } : {}),
      metadata: { path: ["contentW5", "copyFingerprint"], equals: fingerprint },
    }, select: { id: true } });
  }

  async persist(result: ContentResult, revisions: { page: Date | null; entity: Date; template: Date }) {
    if (!result.page) return { status: "SKIPPED", reason: "Generate a W3 page before persisting content." } as const;
    if (result.quality.status === "BLOCKED") return { status: "SKIPPED", reason: "Content quality guardrails blocked persistence." } as const;
    const pageId = result.page.id;
    const copy = copyFingerprint(result);
    return prisma.$transaction(async tx => {
      const page = await tx.websiteSeoPage.findUnique({ where: { id: pageId }, include: { entity: true, template: true } });
      if (!page || page.entityId !== result.entity.id || page.templateId !== result.brief.templateId) {
        return { status: "SKIPPED", reason: "Page mapping changed during generation." } as const;
      }
      const metadata = object(page.metadata);
      const previous = object(metadata.contentW5);
      if (page.status !== "DRAFT" || ["APPROVED", "PUBLISHED"].includes(String(metadata.editorialStatus)) ||
        metadata.manuallyEdited === true || metadata.content !== undefined || metadata.approvedAt !== undefined) {
        return { status: "SKIPPED", reason: "Existing page is protected by lifecycle or editorial ownership." } as const;
      }
      if (metadata.contentW5 !== undefined) {
        if (previous.engine === "W5" && previous.editorialStatus === "DRAFT" && previous.fingerprint === result.generation.fingerprint) {
          return { status: "UNCHANGED", pageId } as const;
        }
        // W5 has no editorial replacement API. Preserve even older machine drafts until explicitly reviewed.
        return { status: "SKIPPED", reason: "Existing content requires an explicit editorial replacement workflow." } as const;
      }
      if (page.updatedAt.getTime() !== revisions.page?.getTime() || page.entity.updatedAt.getTime() !== revisions.entity.getTime() ||
        page.template.updatedAt.getTime() !== revisions.template.getTime()) {
        return { status: "SKIPPED", reason: "Source data changed during generation; generate a fresh preview." } as const;
      }
      const duplicate = await tx.websiteSeoPage.findFirst({ where: { id: { not: pageId },
        metadata: { path: ["contentW5", "copyFingerprint"], equals: copy } }, select: { id: true } });
      if (duplicate) return { status: "SKIPPED", reason: "Duplicate copy already exists on another page." } as const;
      const stored = JSON.parse(JSON.stringify({ ...metadata, contentW5: {
        engine: "W5", editorialStatus: "DRAFT", fingerprint: result.generation.fingerprint, copyFingerprint: copy, result,
      } })) as Prisma.InputJsonObject;
      await tx.websiteSeoPage.update({ where: { id: page.id }, data: { metadata: stored } });
      return { status: "SAVED", pageId } as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
export const websiteContentRepository = new WebsiteContentRepository();
