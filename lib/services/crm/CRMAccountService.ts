import { prisma } from "@/lib/prisma";

export async function createCRMAccount(input: {
  accountName: string;
  corporateId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  city?: string;
  notes?: string;
}) {
  if (!input.accountName.trim()) {
    throw new Error("Account name is required.");
  }

  return prisma.cRMAccount.create({
    data: {
      accountName: input.accountName.trim(),
      corporateId: input.corporateId,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      city: input.city,
      notes: input.notes,
    },
  });
}

export async function recordCRMConversion(input: {
  sourceType: string;
  sourceId?: string;
  targetType: string;
  targetId?: string;
  stage?: string;
  value?: number;
}) {
  if (!input.sourceType || !input.targetType) {
    throw new Error("Conversion source and target are required.");
  }

  return prisma.cRMConversionEvent.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      stage: input.stage,
      value: input.value ?? null,
    },
  });
}