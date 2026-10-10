import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seoObject } from "../../seo/engine/load";
import { PublishingError } from "../types";

const include = { entity: { include: { keywords: { orderBy: { id: "asc" as const } } } }, template: true };
export async function publicationSnapshot(pageId: string, entityId: string) {
  const page = await prisma.websiteSeoPage.findUnique({ where: { id: pageId }, include });
  if (!page || page.entityId !== entityId) throw new PublishingError("Page does not belong to this entity.", 404);
  return page;
}
export type PublicationSnapshot = Awaited<ReturnType<typeof publicationSnapshot>>;
export function publicationRevision(page: PublicationSnapshot): string {
  return createHash("sha256").update(JSON.stringify([page.updatedAt, page.entity.updatedAt, page.template.updatedAt,
    page.entity.keywords.map(k => [k.id, k.updatedAt])])).digest("hex");
}
export function publicationProtected(metadata: unknown): boolean {
  const m = seoObject(metadata); const p = seoObject(m.publishing);
  return m.publicationLocked === true || p.locked === true || m.manuallyEdited === true ||
    (m.publishing !== undefined && p.engine !== "W7") || m.seoOverrides !== undefined || m.seo !== undefined;
}
export async function writePublication(snapshot: PublicationSnapshot, patch: Record<string, unknown>, status: "READY" | "PUBLISHED" | null) {
  return prisma.$transaction(async tx => {
    const current = await tx.websiteSeoPage.findUnique({ where: { id: snapshot.id }, include });
    if (!current || publicationRevision(current) !== publicationRevision(snapshot)) throw new PublishingError("Source changed; retry with a fresh preview.");
    if (publicationProtected(current.metadata)) throw new PublishingError("Publication is manually protected.");
    const metadata = JSON.parse(JSON.stringify({ ...seoObject(current.metadata), ...patch })) as Prisma.InputJsonObject;
    return tx.websiteSeoPage.update({ where: { id: current.id }, data: { ...(status ? { status } : {}), metadata } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
