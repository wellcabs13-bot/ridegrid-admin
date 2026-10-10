// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

const mocks = vi.hoisted(() => {
  const state = {
    corporate: null as any,
    wallet: null as any,
  };

  const db = {
    corporate: {
      findFirst: vi.fn(async () => state.corporate),
    },
    corporateWallet: {
      findUnique: vi.fn(async () => state.wallet),
    },
  };

  return { db, state };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

import { paymentMethodFor } from "@/lib/corporate-employee-mobile/read";

beforeEach(() => {
  mocks.state.corporate = null;
  mocks.state.wallet = null;
  vi.clearAllMocks();
});

describe("corporate employee payment method never falls back to cash", () => {
  it("reports Corporate Credit unavailable when no wallet/limit is configured, without ever suggesting Cash", async () => {
    mocks.state.corporate = { id: "corp-1", companyName: "Acme", status: "ACTIVE", creditLimit: null };
    mocks.state.wallet = null;

    const result = await paymentMethodFor("corp-1");

    expect(result.method).toBe("CORPORATE_CREDIT");
    expect(result.available).toBe(false);
    expect(result).not.toHaveProperty("method", "CASH");
  });

  it("reports Corporate Credit available when an active wallet with a positive limit exists", async () => {
    mocks.state.corporate = { id: "corp-1", companyName: "Acme", status: "ACTIVE", creditLimit: 50000 };
    mocks.state.wallet = { id: "wallet-1", balance: 1000, creditLimit: 50000, updatedAt: new Date() };

    const result = await paymentMethodFor("corp-1");

    expect(result).toEqual({ method: "CORPORATE_CREDIT", available: true });
  });

  it("reports unavailable (never Cash) when the corporate account itself cannot be found", async () => {
    mocks.state.corporate = null;

    const result = await paymentMethodFor("missing-corp");

    expect(result).toEqual({ method: "CORPORATE_CREDIT", available: false });
  });
});

describe("corporate employee booking blocks instead of falling back to cash", () => {
  it("book() rejects with CORPORATE_CREDIT_UNAVAILABLE before ever committing a CASH booking", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../lib/corporate-employee-mobile/write.ts"),
      "utf8"
    );

    expect(source).toMatch(/CORPORATE_CREDIT_UNAVAILABLE/);
    expect(source).toMatch(/Corporate credit is unavailable or insufficient\. Please contact your Corporate Administrator\./);
    expect(source).not.toMatch(/PaymentMethod\.CASH/);
  });
});
