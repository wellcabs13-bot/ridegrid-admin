import {
  Prisma,
  VehicleStatus,
} from "@prisma/client";

import {
  vehicleRepository,
} from "@/lib/repositories/vehicle";

export class VehicleService {
  async getAll(
    where: Prisma.VehicleWhereInput = {}
  ) {
    return vehicleRepository.findAll(where);
  }

  async getById(id: string) {
    return vehicleRepository.findById(id);
  }

  async getByRegistrationNumber(
    registrationNumber: string
  ) {
    return vehicleRepository.findByRegistrationNumber(
      registrationNumber
    );
  }

  async getByVendor(vendorId: string) {
    return vehicleRepository.findByVendor(vendorId);
  }

  async getByDriver(driverId: string) {
    return vehicleRepository.findByDriver(driverId);
  }

  async getByStatus(status: VehicleStatus) {
    return vehicleRepository.findByStatus(status);
  }

  async create(
    data: Prisma.VehicleCreateInput
  ) {
    return vehicleRepository.create(data);
  }

  async update(
    id: string,
    data: Prisma.VehicleUpdateInput
  ) {
    return vehicleRepository.update(id, data);
  }

  async updateStatus(
    id: string,
    status: VehicleStatus
  ) {
    return vehicleRepository.updateStatus(
      id,
      status
    );
  }

  async assignDriver(
    id: string,
    driverId: string | null
  ) {
    return vehicleRepository.assignDriver(
      id,
      driverId
    );
  }

  async delete(id: string) {
    return vehicleRepository.softDelete(id);
  }

  async getStats() {
    return vehicleRepository.getStats();
  }
}

export const vehicleService =
  new VehicleService();