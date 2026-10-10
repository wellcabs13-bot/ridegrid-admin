import { ConfigurationScope, Prisma, SystemSettingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ImageEngineState } from "./types";
export const IMAGE_ENGINE_KEY = "website-seo.ai-image-engine.v1";
export function emptyImageState(): ImageEngineState {
  return { version: 1, jobs: [], assignments: [], presets: [], autoGenerate: false, updatedBy: "", updatedAt: new Date().toISOString() };
}
export async function readImageState(tx: Prisma.TransactionClient = prisma): Promise<ImageEngineState> {
  const setting = await tx.systemSetting.findUnique({ where: { settingKey: IMAGE_ENGINE_KEY } });
  if (!setting) return emptyImageState();
  const state = JSON.parse(setting.settingValue) as ImageEngineState;
  if (state.version !== 1 || !Array.isArray(state.jobs) || !Array.isArray(state.assignments) || !Array.isArray(state.presets) || typeof state.autoGenerate !== "boolean") throw new Error("Invalid stored image engine state.");
  return state;
}
// Match the existing media metadata store. Serializable retries only repeat DB
// work: provider calls and physical file writes must NEVER run in this callback.
export async function mutateImageState<T>(actor: string, work: (state: ImageEngineState, tx: Prisma.TransactionClient) => Promise<T> | T): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const state = await readImageState(tx);
        const result = await work(state, tx);
        state.updatedBy = actor; state.updatedAt = new Date().toISOString();
        const data = { settingValue: JSON.stringify(state), settingType: SystemSettingType.JSON, scope: ConfigurationScope.GLOBAL, description: "AI image jobs, preset overrides, automation and reviewed page image assignments." };
        await tx.systemSetting.upsert({ where: { settingKey: IMAGE_ENGINE_KEY }, create: { settingKey: IMAGE_ENGINE_KEY, ...data }, update: data });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (attempt < 3 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}
