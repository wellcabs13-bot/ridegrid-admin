import { Prisma } from "@prisma/client";

import {
  corporateRepository,
} from "@/lib/repositories/corporate";

export class CorporateService {
  async getAll() {
    return corporateRepository.findAll();
  }

  async getById(id: string) {
    return corporateRepository.findById(id);
  }

  async getByEmail(email: string) {
    return corporateRepository.findByEmail(email);
  }

  async getByGST(gstNumber: string) {
    return corporateRepository.findByGST(gstNumber);
  }

  async create(
    data: Prisma.CorporateCreateInput
  ) {
    return corporateRepository.create(data);
  }

  async update(
    id: string,
    data: Prisma.CorporateUpdateInput
  ) {
    return corporateRepository.update(id, data);
  }

  async delete(id: string) {
    return corporateRepository.delete(id);
  }

  async restore(id: string) {
    return corporateRepository.restore(id);
  }

  async getBranches(corporateId: string) {
    return corporateRepository.findBranches(
      corporateId
    );
  }

  async getEmployees(corporateId: string) {
    return corporateRepository.findEmployees(
      corporateId
    );
  }

  async getDepartments(corporateId: string) {
    return corporateRepository.findDepartments(
      corporateId
    );
  }

  async getCostCenters(corporateId: string) {
    return corporateRepository.findCostCenters(
      corporateId
    );
  }

  async getTravelPolicies(corporateId: string) {
    return corporateRepository.findTravelPolicies(
      corporateId
    );
  }

  async getWallet(corporateId: string) {
    return corporateRepository.findWallet(
      corporateId
    );
  }

  async getApprovalRules(corporateId: string) {
    return corporateRepository.findApprovalRules(
      corporateId
    );
  }

  async getContracts(corporateId: string) {
    return corporateRepository.findContracts(
      corporateId
    );
  }

  async getInvoiceSetting(corporateId: string) {
    return corporateRepository.findInvoiceSetting(
      corporateId
    );
  }

  async getDiscounts(corporateId: string) {
    return corporateRepository.findDiscounts(
      corporateId
    );
  }

  async getReports(corporateId: string) {
    return corporateRepository.findReports(
      corporateId
    );
  }
}

export const corporateService =
  new CorporateService();