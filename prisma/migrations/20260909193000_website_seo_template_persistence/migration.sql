-- W3 Website & SEO Template Persistence
-- Isolated migration: no existing RideGrid core tables modified.

CREATE TYPE "WebsiteSeoTemplateStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
);

CREATE TABLE "WebsiteSeoTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "entityType" "WebsiteSeoEntityType" NOT NULL,
    "status" "WebsiteSeoTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "pathPattern" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSeoTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteSeoTemplate_key_key"
ON "WebsiteSeoTemplate"("key");

CREATE INDEX "WebsiteSeoTemplate_entityType_idx"
ON "WebsiteSeoTemplate"("entityType");

CREATE INDEX "WebsiteSeoTemplate_status_idx"
ON "WebsiteSeoTemplate"("status");

CREATE INDEX "WebsiteSeoTemplate_createdAt_idx"
ON "WebsiteSeoTemplate"("createdAt");