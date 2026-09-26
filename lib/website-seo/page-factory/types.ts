import type { WebsiteSeoEntity, WebsiteSeoPage, WebsiteSeoTemplate, WebsiteSeoKeyword } from "@prisma/client";
import type { keywordIntelligenceEngine } from "../keywords/engine";
import type { websiteContentEngine } from "../content/engine";
import type { websiteSeoEngine } from "../seo/engine";
import type { PublicationResult } from "../publishing/types";

type WireDates<T> = Omit<T, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
export type FactoryEntity = WireDates<WebsiteSeoEntity>;
export type FactoryTemplate = WireDates<WebsiteSeoTemplate>;
export type FactoryPage = WireDates<WebsiteSeoPage> & { entity: FactoryEntity; template: FactoryTemplate };
export type FactoryKeyword = WireDates<WebsiteSeoKeyword>;
export type KeywordResult = Awaited<ReturnType<typeof keywordIntelligenceEngine.generate>>;
export type ContentResult = Awaited<ReturnType<typeof websiteContentEngine.generate>>;
export type SeoResult = Awaited<ReturnType<typeof websiteSeoEngine.generate>>;
export type ReadinessResult = PublicationResult;
export interface FactoryInventory { entities: FactoryEntity[]; pages: FactoryPage[]; templates: FactoryTemplate[] }
export const FACTORY_STEPS = ["page", "keywords", "content", "seo", "readiness"] as const;
export type FactoryStep = typeof FACTORY_STEPS[number];
export interface StepResult { state: "NOT STARTED" | "RUNNING" | "COMPLETE" | "BLOCKED" | "ERROR"; message?: string; data?: unknown }
export interface FactoryRun { entityId: string; steps: Record<FactoryStep, StepResult>; page?: FactoryPage; error?: string }
