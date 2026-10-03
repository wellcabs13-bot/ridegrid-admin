-- W15 additive persistence only. Apply separately after review.
CREATE TABLE "WebsiteSeoScaleRun" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "entityType" "WebsiteSeoEntityType" NOT NULL,
  "rolloutLevel" TEXT NOT NULL, "itemLimit" INTEGER NOT NULL, "batchSize" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "executionToken" TEXT, "heartbeatAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteSeoScaleRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteSeoScaleRun_limits" CHECK ("batchSize" BETWEEN 1 AND 25 AND "itemLimit" BETWEEN 1 AND 5000)
);
CREATE TABLE "WebsiteSeoScaleItem" (
  "id" TEXT NOT NULL, "runId" TEXT NOT NULL, "candidateKey" TEXT NOT NULL,
  "entityType" "WebsiteSeoEntityType" NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "metadata" JSONB, "selected" BOOLEAN NOT NULL DEFAULT false, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "entityId" TEXT, "pageId" TEXT, "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteSeoScaleItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteSeoScaleItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WebsiteSeoScaleRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WebsiteSeoScaleRun_status_createdAt_idx" ON "WebsiteSeoScaleRun"("status", "createdAt");
-- One W15 worker at a time across runs; prevents concurrent scale creation races.
CREATE UNIQUE INDEX "WebsiteSeoScaleRun_single_worker" ON "WebsiteSeoScaleRun" ((true)) WHERE "executionToken" IS NOT NULL;
CREATE UNIQUE INDEX "WebsiteSeoScaleItem_runId_candidateKey_key" ON "WebsiteSeoScaleItem"("runId", "candidateKey");
CREATE INDEX "WebsiteSeoScaleItem_runId_status_id_idx" ON "WebsiteSeoScaleItem"("runId", "status", "id");
