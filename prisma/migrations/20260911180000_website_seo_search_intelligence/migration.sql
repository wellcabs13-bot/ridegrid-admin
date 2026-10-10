CREATE TABLE "WebsiteSeoCompetitor" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteSeoCompetitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteSeoSearchObservation" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "keywordId" TEXT,
  "pageId" TEXT,
  "competitorId" TEXT,
  "url" TEXT,
  "rank" INTEGER,
  "visibilityScore" DOUBLE PRECISION,
  "mentioned" BOOLEAN,
  "cited" BOOLEAN,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteSeoSearchObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteSeoCompetitor_domain_key" ON "WebsiteSeoCompetitor"("domain");
CREATE INDEX "WebsiteSeoCompetitor_status_idx" ON "WebsiteSeoCompetitor"("status");
CREATE INDEX "WebsiteSeoSearchObservation_kind_observedAt_idx" ON "WebsiteSeoSearchObservation"("kind", "observedAt");
CREATE INDEX "WebsiteSeoSearchObservation_query_observedAt_idx" ON "WebsiteSeoSearchObservation"("query", "observedAt");
CREATE INDEX "WebsiteSeoSearchObservation_keywordId_observedAt_idx" ON "WebsiteSeoSearchObservation"("keywordId", "observedAt");
CREATE INDEX "WebsiteSeoSearchObservation_pageId_observedAt_idx" ON "WebsiteSeoSearchObservation"("pageId", "observedAt");
CREATE INDEX "WebsiteSeoSearchObservation_competitorId_observedAt_idx" ON "WebsiteSeoSearchObservation"("competitorId", "observedAt");

ALTER TABLE "WebsiteSeoSearchObservation"
ADD CONSTRAINT "WebsiteSeoSearchObservation_competitorId_fkey"
FOREIGN KEY ("competitorId") REFERENCES "WebsiteSeoCompetitor"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
