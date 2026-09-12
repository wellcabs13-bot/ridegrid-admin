-- W2 Website & SEO Core Entity Engine
-- Isolated migration: no existing RideGrid core tables modified.

CREATE TYPE "WebsiteSeoEntityType" AS ENUM (
  'ROUTE',
  'CITY',
  'SERVICE',
  'AIRPORT',
  'AREA',
  'VEHICLE'
);

CREATE TYPE "WebsiteSeoEntityStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
);

CREATE TABLE "WebsiteSeoEntity" (
    "id" TEXT NOT NULL,
    "type" "WebsiteSeoEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "WebsiteSeoEntityStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceId" TEXT,
    "parentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteSeoEntity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteSeoEntity_type_idx"
ON "WebsiteSeoEntity"("type");

CREATE INDEX "WebsiteSeoEntity_status_idx"
ON "WebsiteSeoEntity"("status");

CREATE INDEX "WebsiteSeoEntity_sourceId_idx"
ON "WebsiteSeoEntity"("sourceId");

CREATE INDEX "WebsiteSeoEntity_parentId_idx"
ON "WebsiteSeoEntity"("parentId");

CREATE INDEX "WebsiteSeoEntity_createdAt_idx"
ON "WebsiteSeoEntity"("createdAt");

CREATE UNIQUE INDEX "WebsiteSeoEntity_type_slug_key"
ON "WebsiteSeoEntity"("type", "slug");

ALTER TABLE "WebsiteSeoEntity"
ADD CONSTRAINT "WebsiteSeoEntity_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "WebsiteSeoEntity"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
