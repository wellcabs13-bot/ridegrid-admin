import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class CorporateRepository {
  async findAll() {
    return prisma.corporate.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        branches: true,
        employees: true,
        costCenters: true,
        travelPolicies: true,
        wallet: true,
        approvalRules: true,
        contracts: true,
        invoiceSetting: true,
        discounts: true,
        reports: true,
        corporateDepartments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.corporate.findUnique({
      where: { id },
      include: {
        branches: true,
        employees: true,
        costCenters: true,
        travelPolicies: true,
        wallet: true,
        approvalRules: true,
        contracts: true,
        invoiceSetting: true,
        discounts: true,
        reports: true,
        corporateDepartments: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.corporate.findUnique({
      where: { email },
    });
  }

  async findByGST(gstNumber: string) {
    return prisma.corporate.findUnique({
      where: { gstNumber },
    });
  }

  async create(
    data: Prisma.CorporateCreateInput
  ) {
    return prisma.corporate.create({
      data,
      include: {
        branches: true,
        employees: true,
        wallet: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.CorporateUpdateInput
  ) {
    return prisma.corporate.update({
      where: { id },
      data,
      include: {
        branches: true,
        employees: true,
        wallet: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.corporate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string) {
    return prisma.corporate.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  async findBranches(corporateId: string) {
    return prisma.corporateBranch.findMany({
      where: { corporateId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findEmployees(corporateId: string) {
    return prisma.corporateEmployee.findMany({
      where: { corporateId },
      include: {
        branch: true,
        department: true,
        costCenter: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findDepartments(corporateId: string) {
    return prisma.corporateDepartment.findMany({
      where: { corporateId },
      include: {
        branch: true,
        employees: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findCostCenters(corporateId: string) {
    return prisma.corporateCostCenter.findMany({
      where: { corporateId },
      include: {
        employees: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findTravelPolicies(corporateId: string) {
    return prisma.corporateTravelPolicy.findMany({
      where: { corporateId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findWallet(corporateId: string) {
    return prisma.corporateWallet.findUnique({
      where: { corporateId },
    });
  }

  async findApprovalRules(corporateId: string) {
    return prisma.corporateApprovalRule.findMany({
      where: { corporateId },
      orderBy: {
        level: "asc",
      },
    });
  }

  async findContracts(corporateId: string) {
    return prisma.corporateContract.findMany({
      where: { corporateId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findInvoiceSetting(corporateId: string) {
    return prisma.corporateInvoiceSetting.findUnique({
      where: { corporateId },
    });
  }

  async findDiscounts(corporateId: string) {
    return prisma.corporateDiscount.findMany({
      where: { corporateId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findReports(corporateId: string) {
    return prisma.corporateReport.findMany({
      where: { corporateId },
      orderBy: {
        periodEnd: "desc",
      },
    });
  }
}

export const corporateRepository =
  new CorporateRepository();