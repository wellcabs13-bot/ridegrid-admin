import { prisma } from "@/lib/prisma";

export type LedgerLine = {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
};

export async function postJournal(input: {
  referenceType?: string;
  referenceId?: string;
  description?: string;
  entries: LedgerLine[];
}) {
  if (!input.entries.length) {
    throw new Error("Journal requires entries.");
  }

  const debit = input.entries.reduce((sum, e) => sum + (e.debit ?? 0), 0);
  const credit = input.entries.reduce((sum, e) => sum + (e.credit ?? 0), 0);

  if (Math.round(debit * 100) !== Math.round(credit * 100)) {
    throw new Error("Unbalanced journal.");
  }

  for (const entry of input.entries) {
    if ((entry.debit ?? 0) < 0 || (entry.credit ?? 0) < 0) {
      throw new Error("Ledger amounts cannot be negative.");
    }
    if ((entry.debit ?? 0) > 0 && (entry.credit ?? 0) > 0) {
      throw new Error("A journal line cannot contain both debit and credit.");
    }
  }

  return prisma.$transaction(async tx => {
    const journal = await tx.journal.create({
      data: {
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        status: "POSTED",
        postedAt: new Date(),
        entries: {
          create: input.entries.map(entry => ({
            accountId: entry.accountId,
            debit: entry.debit ?? 0,
            credit: entry.credit ?? 0,
            description: entry.description,
          })),
        },
      },
      include: { entries: true },
    });

    return journal;
  });
}