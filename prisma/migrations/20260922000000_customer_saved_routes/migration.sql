CREATE TABLE "CustomerSavedRoute" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "tripType" TEXT NOT NULL,
  "pickupCity" TEXT NOT NULL,
  "dropCity" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "fareWatch" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerSavedRoute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerSavedRoute_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomerSavedRoute_customerId_idx" ON "CustomerSavedRoute"("customerId");
CREATE UNIQUE INDEX "customer_saved_route_identity" ON "CustomerSavedRoute"("customerId", "serviceType", "tripType", "pickupCity", "dropCity", "category", "packageName");
