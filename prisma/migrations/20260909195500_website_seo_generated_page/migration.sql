-- W3.7 Website & SEO Generated Page Persistence
-- Isolated migration.
-- No RideGrid booking/pricing/vendor/customer/corporate core tables modified.

CREATE TYPE "WebsiteSeoPageStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TABLE "WebsiteSeoPage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "status" "WebsiteSeoPageStatus" NOT NULL DEFAULT 'DRAFT',
    "entityId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "generationVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSeoPage_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteSeoPage_key_key"
ON "WebsiteSeoPage"("key");

CREATE UNIQUE INDEX "WebsiteSeoPage_pathname_key"
ON "WebsiteSeoPage"("pathname");

CREATE UNIQUE INDEX "WebsiteSeoPage_entityId_templateId_key"
ON "WebsiteSeoPage"("entityId", "templateId");

CREATE INDEX "WebsiteSeoPage_entityId_idx"
ON "WebsiteSeoPage"("entityId");

CREATE INDEX "WebsiteSeoPage_templateId_idx"
ON "WebsiteSeoPage"("templateId");

CREATE INDEX "WebsiteSeoPage_status_idx"
ON "WebsiteSeoPage"("status");

CREATE INDEX "WebsiteSeoPage_pathname_idx"
ON "WebsiteSeoPage"("pathname");

CREATE INDEX "WebsiteSeoPage_createdAt_idx"
ON "WebsiteSeoPage"("createdAt");

ALTER TABLE "WebsiteSeoPage"
ADD CONSTRAINT "WebsiteSeoPage_entityId_fkey"
FOREIGN KEY ("entityId")
REFERENCES "WebsiteSeoEntity"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "WebsiteSeoPage"
ADD CONSTRAINT "WebsiteSeoPage_templateId_fkey"
FOREIGN KEY ("templateId")
REFERENCES "WebsiteSeoTemplate"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;