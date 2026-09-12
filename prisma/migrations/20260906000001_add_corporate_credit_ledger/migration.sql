ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CORPORATE_CREDIT';
CREATE TABLE IF NOT EXISTS "CorporateWalletTransaction" (
"id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "transactionType" "WalletTransactionType" NOT NULL,
"amount" DECIMAL(12,2) NOT NULL, "balanceBefore" DECIMAL(12,2), "balanceAfter" DECIMAL(12,2),
"referenceId" TEXT, "referenceType" TEXT, "performedBy" TEXT, "description" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "CorporateWalletTransaction_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CorporateWalletTransaction_walletId_idx" ON "CorporateWalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "CorporateWalletTransaction_transactionType_idx" ON "CorporateWalletTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS "CorporateWalletTransaction_createdAt_idx" ON "CorporateWalletTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "CorporateWalletTransaction_referenceId_idx" ON "CorporateWalletTransaction"("referenceId");
CREATE INDEX IF NOT EXISTS "CorporateWalletTransaction_walletId_createdAt_idx" ON "CorporateWalletTransaction"("walletId","createdAt");
ALTER TABLE "CorporateWalletTransaction" ADD CONSTRAINT "CorporateWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CorporateWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
