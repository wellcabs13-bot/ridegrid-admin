CREATE TYPE "WebsiteSeoKeywordType" AS ENUM (
  'PRIMARY',
  'SECONDARY',
  'LONG_TAIL',
  'LOCAL',
  'ROUTE',
  'CITY',
  'AIRPORT',
  'SERVICE',
  'VEHICLE',
  'COMMERCIAL',
  'INFORMATIONAL',
  'QUESTION'
);

CREATE TYPE "WebsiteSeoKeywordIntent" AS ENUM (
  'TRANSACTIONAL',
  'COMMERCIAL',
  'INFORMATIONAL',
  'NAVIGATIONAL',
  'LOCAL'
);

CREATE TYPE "WebsiteSeoKeywordStatus" AS ENUM (
  'DISCOVERED',
  'APPROVED',
  'MAPPED',
  'ACTIVE',
  'REJECTED',
  'ARCHIVED'
);

CREATE TABLE "WebsiteSeoKeyword" (
  "id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "normalizedKeyword" TEXT NOT NULL,
  "type" "WebsiteSeoKeywordType" NOT NULL,
  "intent" "WebsiteSeoKeywordIntent" NOT NULL,
  "status" "WebsiteSeoKeywordStatus" NOT NULL DEFAULT 'DISCOVERED',
  "entityId" TEXT,
  "entityType" "WebsiteSeoEntityType",
  "clusterKey" TEXT,
  "primaryKeywordId" TEXT,
  "metrics" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebsiteSeoKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteSeoKeyword_normalizedKeyword_entityId_key"
ON "WebsiteSeoKeyword"("normalizedKeyword", "entityId");

CREATE INDEX "WebsiteSeoKeyword_normalizedKeyword_idx"
ON "WebsiteSeoKeyword"("normalizedKeyword");

CREATE INDEX "WebsiteSeoKeyword_type_idx"
ON "WebsiteSeoKeyword"("type");

CREATE INDEX "WebsiteSeoKeyword_intent_idx"
ON "WebsiteSeoKeyword"("intent");

CREATE INDEX "WebsiteSeoKeyword_status_idx"
ON "WebsiteSeoKeyword"("status");

CREATE INDEX "WebsiteSeoKeyword_entityId_idx"
ON "WebsiteSeoKeyword"("entityId");

CREATE INDEX "WebsiteSeoKeyword_entityType_idx"
ON "WebsiteSeoKeyword"("entityType");

CREATE INDEX "WebsiteSeoKeyword_clusterKey_idx"
ON "WebsiteSeoKeyword"("clusterKey");

CREATE INDEX "WebsiteSeoKeyword_primaryKeywordId_idx"
ON "WebsiteSeoKeyword"("primaryKeywordId");

CREATE INDEX "WebsiteSeoKeyword_createdAt_idx"
ON "WebsiteSeoKeyword"("createdAt");

ALTER TABLE "WebsiteSeoKeyword"
ADD CONSTRAINT "WebsiteSeoKeyword_entityId_fkey"
FOREIGN KEY ("entityId")
REFERENCES "WebsiteSeoEntity"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "WebsiteSeoKeyword"
ADD CONSTRAINT "WebsiteSeoKeyword_primaryKeywordId_fkey"
FOREIGN KEY ("primaryKeywordId")
REFERENCES "WebsiteSeoKeyword"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;