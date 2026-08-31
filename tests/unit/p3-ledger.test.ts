import { describe, expect, it } from "vitest";
import { postJournal } from "../../lib/services/finance/LedgerService";

describe("P3.1 Finance Ledger", () => {
  it("rejects an unbalanced journal", async () => {
    await expect(
      postJournal({
        referenceType: "TEST",
        referenceId: "1",
        entries: [
          { accountId: "cash", debit: 100 },
          { accountId: "revenue", credit: 90 },
        ],
      })
    ).rejects.toThrow("Unbalanced journal.");
  });

  it("rejects a journal line containing both debit and credit", async () => {
    await expect(
      postJournal({
        referenceType: "TEST",
        referenceId: "2",
        entries: [
          { accountId: "cash", debit: 100, credit: 100 },
        ],
      })
    ).rejects.toThrow("both debit and credit");
  });
});