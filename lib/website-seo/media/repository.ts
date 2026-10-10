import { ConfigurationScope, Prisma, SystemSettingType, type FileAsset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StoredFile } from "@/lib/services/storage/FileStorageService";
import type { WebsiteMedia, WebsiteMediaFilters, WebsiteMediaLibrary, WebsiteMediaMetadata, WebsiteMediaUpdate } from "./types";
import { hasMeaningfulAltText, validateMediaStore, validateMediaUpdate, WebsiteMediaValidationError } from "./validation";

const SETTING_KEY = "website-seo.media-metadata";
const ENTITY_TYPE = "WEBSITE_MEDIA";

async function read(tx: Prisma.TransactionClient): Promise<WebsiteMediaMetadata[]> {
  const setting = await tx.systemSetting.findUnique({ where: { settingKey: SETTING_KEY } });
  if (!setting) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(setting.settingValue); }
  catch { throw new Error("Stored website media contains invalid JSON."); }
  return validateMediaStore(parsed);
}

async function write(tx: Prisma.TransactionClient, items: WebsiteMediaMetadata[]) {
  const data = {
    settingValue: JSON.stringify({ version: 1, items }),
    settingType: SystemSettingType.JSON,
    scope: ConfigurationScope.GLOBAL,
    description: "Editorial metadata for RideGrid website FileAsset records.",
  };
  await tx.systemSetting.upsert({ where: { settingKey: SETTING_KEY }, create: { settingKey: SETTING_KEY, ...data }, update: data });
}

// The shared JSON document needs serializable read/modify/write to avoid lost entries.
async function mutate<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}

function join(metadata: WebsiteMediaMetadata, file: FileAsset): WebsiteMedia {
  return { ...metadata, fileName: file.fileName, originalName: file.originalName, mimeType: file.mimeType, fileSize: file.fileSize, fileUrl: file.fileUrl, uploadedAt: file.createdAt.toISOString() };
}

function defaultMetadata(file: FileAsset): WebsiteMediaMetadata {
  return { fileAssetId: file.id, title: file.originalName || file.fileName, altText: "", caption: "", category: "GENERAL", status: "DRAFT", createdAt: file.createdAt.toISOString(), updatedAt: file.updatedAt.toISOString() };
}

export class WebsiteMediaRepository {
  async listPublic(): Promise<WebsiteMedia[]> {
    const metadata = (await read(prisma)).filter(m => m.status === "ACTIVE" && !m.aiGenerated && !m.caption.startsWith("[AI-generated]"));
    if (!metadata.length) return [];
    const files = await prisma.fileAsset.findMany({ where: { id: { in: metadata.map(m => m.fileAssetId) }, entityType: ENTITY_TYPE, mimeType: { in: ["image/png", "image/jpeg"] } }, orderBy: { createdAt: "desc" }, take: 100 });
    const byId = new Map(metadata.map(m => [m.fileAssetId,m]));
    return files.flatMap(file => { const m = byId.get(file.id); return m ? [join(m,file)] : []; });
  }
  async list(filters: WebsiteMediaFilters = {}): Promise<WebsiteMediaLibrary> {
    return prisma.$transaction(async (tx) => {
      const metadata = await read(tx);
      const files = await tx.fileAsset.findMany({ where: { entityType: ENTITY_TYPE }, orderBy: { createdAt: "desc" } });
      const byId = new Map(metadata.map((item) => [item.fileAssetId, item]));
      const all = files.map((file) => join(byId.get(file.id) ?? defaultMetadata(file), file));
      // Missing references are omitted. References to other modules are never joined.
      const referencedFiles = metadata.length ? await tx.fileAsset.findMany({ where: { id: { in: metadata.map((item) => item.fileAssetId) } }, select: { id: true } }) : [];
      const present = new Set(referencedFiles.map((file) => file.id));
      const search = filters.search?.trim().toLowerCase();
      return {
        items: all.filter((item) => (!filters.status || item.status === filters.status) &&
          (!filters.category || item.category === filters.category) &&
          (!filters.mimeType || (filters.mimeType === "image" ? item.mimeType?.startsWith("image/") : item.mimeType === filters.mimeType)) &&
          (!search || [item.title, item.altText, item.caption, item.fileName, item.originalName ?? ""].some((text) => text.toLowerCase().includes(search)))),
        summary: { total: all.length, active: all.filter((item) => item.status === "ACTIVE").length, draft: all.filter((item) => item.status === "DRAFT").length, archived: all.filter((item) => item.status === "ARCHIVED").length },
        missingFileCount: metadata.filter((item) => !present.has(item.fileAssetId)).length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async create(stored: StoredFile, input: WebsiteMediaUpdate, aiJobId?: string): Promise<WebsiteMedia> {
    const validated = validateMediaUpdate(input);
    if (aiJobId !== undefined && !/^[a-zA-Z0-9-]{1,100}$/.test(aiJobId)) throw new WebsiteMediaValidationError("Invalid AI image job id.");
    return mutate(async (tx) => {
      const items = await read(tx);
      const file = await tx.fileAsset.create({ data: {
        id: stored.id, fileName: stored.storageKey.split("/").pop() || stored.name,
        originalName: stored.name, mimeType: stored.mimeType, fileSize: stored.size,
        fileUrl: stored.fileUrl, storageKey: stored.storageKey, entityType: ENTITY_TYPE,
      } });
      const item: WebsiteMediaMetadata = { ...defaultMetadata(file), ...validated, status: "DRAFT", ...(aiJobId ? { aiGenerated: true, aiJobId } : {}) };
      await write(tx, [...items, item]);
      return join(item, file);
    });
  }

  // API [id] is always FileAsset.id; only website-owned files are editable.
  async update(id: string, input: WebsiteMediaUpdate): Promise<WebsiteMedia | null> {
    const validated = validateMediaUpdate(input);
    return mutate(async (tx) => {
      const file = await tx.fileAsset.findFirst({ where: { id, entityType: ENTITY_TYPE } });
      if (!file) return null;
      const items = await read(tx);
      const existing = items.find((item) => item.fileAssetId === id) ?? defaultMetadata(file);
      const item = { ...existing, ...validated, updatedAt: new Date().toISOString() };
      if (item.status === "ACTIVE" && file.mimeType?.startsWith("image/") && !hasMeaningfulAltText(item.altText)) {
        throw new WebsiteMediaValidationError("Add descriptive alt text before activating an image.");
      }
      await write(tx, [...items.filter((row) => row.fileAssetId !== id), item]);
      return join(item, file);
    });
  }

  async archive(id: string): Promise<WebsiteMedia | null> {
    return this.update(id, { status: "ARCHIVED" });
  }
}

export const websiteMediaRepository = new WebsiteMediaRepository();
