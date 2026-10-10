-- Corporate Portal completion: additive only. Branch/department status and heads,
-- employee managers and assigned policy, scoped policies/budgets, typed approval
-- workflow steps, company billing/contact details, document categories and a
-- corporate-only booking archive flag. No existing column is changed or dropped.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "corporateArchivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Corporate" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingPincode" TEXT,
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "contactPersonDesignation" TEXT,
ADD COLUMN     "contactPersonEmail" TEXT,
ADD COLUMN     "contactPersonMobile" TEXT,
ADD COLUMN     "contactPersonName" TEXT;

-- AlterTable
ALTER TABLE "CorporateBranch" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CorporateDepartment" ADD COLUMN     "approverEmployeeId" TEXT,
ADD COLUMN     "headEmployeeId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CorporateEmployee" ADD COLUMN     "approvalManagerId" TEXT,
ADD COLUMN     "canBook" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportingManagerId" TEXT,
ADD COLUMN     "travelPolicyId" TEXT;

-- AlterTable
ALTER TABLE "CorporateTravelPolicy" ADD COLUMN     "allowedCities" JSONB,
ADD COLUMN     "blockAboveAmount" DECIMAL(12,2),
ADD COLUMN     "bookingEndHour" INTEGER,
ADD COLUMN     "bookingStartHour" INTEGER,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "localAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roundTripAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weekendTravelAllowed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CorporateApprovalRule" ADD COLUMN     "approverEmployeeId" TEXT,
ADD COLUMN     "approverType" TEXT NOT NULL DEFAULT 'CORPORATE_ADMIN',
ADD COLUMN     "minAmount" DECIMAL(12,2),
ADD COLUMN     "scopeBranchId" TEXT,
ADD COLUMN     "scopeDepartmentId" TEXT,
ADD COLUMN     "scopeEmployeeId" TEXT;

-- AlterTable
ALTER TABLE "CorporateApprovalStep" ADD COLUMN     "approverLabel" TEXT,
ADD COLUMN     "approverType" TEXT,
ADD COLUMN     "assignedEmployeeId" TEXT,
ADD COLUMN     "assignedUserId" TEXT;

-- AlterTable
ALTER TABLE "CorporateBudget" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "DocumentRecord" ADD COLUMN     "category" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "CorporateDepartment_headEmployeeId_idx" ON "CorporateDepartment"("headEmployeeId");

-- CreateIndex
CREATE INDEX "CorporateDepartment_approverEmployeeId_idx" ON "CorporateDepartment"("approverEmployeeId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_reportingManagerId_idx" ON "CorporateEmployee"("reportingManagerId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_approvalManagerId_idx" ON "CorporateEmployee"("approvalManagerId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_travelPolicyId_idx" ON "CorporateEmployee"("travelPolicyId");

-- CreateIndex
CREATE INDEX "CorporateTravelPolicy_corporateId_isActive_idx" ON "CorporateTravelPolicy"("corporateId", "isActive");

-- CreateIndex
CREATE INDEX "CorporateTravelPolicy_branchId_idx" ON "CorporateTravelPolicy"("branchId");

-- CreateIndex
CREATE INDEX "CorporateTravelPolicy_departmentId_idx" ON "CorporateTravelPolicy"("departmentId");

-- CreateIndex
CREATE INDEX "CorporateBudget_branchId_idx" ON "CorporateBudget"("branchId");

-- CreateIndex
CREATE INDEX "CorporateBudget_departmentId_idx" ON "CorporateBudget"("departmentId");

-- CreateIndex
CREATE INDEX "CorporateBudget_employeeId_idx" ON "CorporateBudget"("employeeId");

-- AddForeignKey
ALTER TABLE "CorporateDepartment" ADD CONSTRAINT "CorporateDepartment_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "CorporateEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateDepartment" ADD CONSTRAINT "CorporateDepartment_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES "CorporateEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "CorporateEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_approvalManagerId_fkey" FOREIGN KEY ("approvalManagerId") REFERENCES "CorporateEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_travelPolicyId_fkey" FOREIGN KEY ("travelPolicyId") REFERENCES "CorporateTravelPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateTravelPolicy" ADD CONSTRAINT "CorporateTravelPolicy_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "CorporateBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateTravelPolicy" ADD CONSTRAINT "CorporateTravelPolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CorporateDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBudget" ADD CONSTRAINT "CorporateBudget_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "CorporateBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBudget" ADD CONSTRAINT "CorporateBudget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CorporateDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateBudget" ADD CONSTRAINT "CorporateBudget_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "CorporateEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

