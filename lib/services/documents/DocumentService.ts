import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class DocumentService {
  async files(where: Prisma.FileAssetWhereInput = {}) {
    return prisma.fileAsset.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async documents(where: Prisma.DocumentRecordWhereInput = {}) {
    return prisma.documentRecord.findMany({
      where,
      include: { file: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async createFile(data: Prisma.FileAssetCreateInput) {
    return prisma.fileAsset.create({ data });
  }

  async createDocument(data: Prisma.DocumentRecordCreateInput) {
    return prisma.documentRecord.create({
      data,
      include: { file: true },
    });
  }

  async getDocument(id: string) {
    return prisma.documentRecord.findUnique({
      where: { id },
      include: { file: true },
    });
  }
}

export const documentService = new DocumentService();
