// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const mocks = vi.hoisted(() => {
  const state = {
    users: [] as any[],
    customers: [] as any[],
    refreshTokens: [] as any[],
    idCounter: 0,
  };

  function nextId(prefix: string) {
    state.idCounter += 1;
    return `${prefix}-${state.idCounter}`;
  }

  function findUserByEmail(email: string) {
    return state.users.find((u) => u.email === email) ?? null;
  }

  function matches(u: any, where: any): boolean {
    if (!where) return true;
    if (where.deletedAt === null && u.deletedAt) return false;
    if (where.role && u.role !== where.role) return false;
    if (where.id?.not && u.id === where.id.not) return false;
    if (where.email?.equals && u.email.toLowerCase() !== where.email.equals.toLowerCase()) return false;
    if (where.mobile?.in && !where.mobile.in.includes(u.mobile)) return false;
    if (where.OR && !where.OR.some((w: any) => matches(u, w))) return false;
    return true;
  }

  const db = {
    user: {
      findFirst: vi.fn(async ({ where }: any) => state.users.find((u) => matches(u, where)) ?? null),
      findMany: vi.fn(async ({ where }: any) => state.users.filter((u) => matches(u, where))),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email !== undefined) return findUserByEmail(where.email);
        if (where.id !== undefined)
          return state.users.find((u) => u.id === where.id) ?? null;
        return null;
      }),
    },
    customer: {
      create: vi.fn(async ({ data, include }: any) => {
        const userData = data.user.create;

        if (findUserByEmail(userData.email)) {
          const err: any = new Error("Unique constraint failed");
          err.code = "P2002";
          throw err;
        }

        const user = {
          id: nextId("user"),
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile ?? null,
          password: userData.password,
          role: userData.role,
          isActive: userData.isActive,
          isVerified: userData.isVerified,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        state.users.push(user);

        const customer = {
          id: nextId("customer"),
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          deletedAt: null,
          createdAt: new Date(),
        };

        state.customers.push(customer);

        if (include?.user?.select) {
          const selected: any = {};
          for (const key of Object.keys(include.user.select)) {
            selected[key] = (user as any)[key];
          }
          return { ...customer, user: selected };
        }

        return { ...customer, user };
      }),
    },
    refreshToken: {
      create: vi.fn(async ({ data }: any) => {
        const record = { ...data, revokedAt: null };
        state.refreshTokens.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) =>
        state.refreshTokens.find((t) => t.tokenHash === where.tokenHash) ??
        null
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    $transaction: vi.fn(async (fn: any) => fn(db)),
  };

  return { db, state };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

import { POST as registerCustomer } from "@/app/api/customers/route";
import { POST as login } from "@/app/api/auth/login/route";

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(`https://ridegrid.test${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_PASSWORD = "Str0ng!Pass";

beforeEach(() => {
  mocks.state.users.length = 0;
  mocks.state.customers.length = 0;
  mocks.state.refreshTokens.length = 0;
  vi.clearAllMocks();
});

describe("customer registration issues a login-valid password", () => {
  it("hashes the submitted password and never stores it as plaintext", async () => {
    const res = await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    expect(res.status).toBe(201);

    const stored = mocks.state.users[0];
    expect(stored.password).not.toBe(VALID_PASSWORD);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it("allows immediate login with the exact submitted credentials", async () => {
    await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    const res = await login(
      jsonRequest("/api/auth/login", {
        email: "ada@example.com",
        password: VALID_PASSWORD,
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.user.role).toBe("CUSTOMER");
  });

  it("rejects login with an incorrect password", async () => {
    await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    const res = await login(
      jsonRequest("/api/auth/login", {
        email: "ada@example.com",
        password: "WrongPass1!",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("registers the user as an active CUSTOMER linked to a customer profile", async () => {
    await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    const user = mocks.state.users[0];
    const customer = mocks.state.customers[0];

    expect(user.role).toBe("CUSTOMER");
    expect(user.isActive).toBe(true);
    expect(customer.userId).toBe(user.id);
  });

  it("normalizes email consistently so casing/whitespace does not block login", async () => {
    await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "  Ada@Example.com  ",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    expect(mocks.state.users[0].email).toBe("ada@example.com");

    const res = await login(
      jsonRequest("/api/auth/login", {
        email: "  ADA@EXAMPLE.COM  ",
        password: VALID_PASSWORD,
      })
    );

    expect(res.status).toBe(200);
  });

  it("does not overwrite an existing user's password on duplicate registration", async () => {
    await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9876543210",
        password: VALID_PASSWORD,
      })
    );

    const duplicate = await registerCustomer(
      jsonRequest("/api/customers", {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        mobile: "9999999999",
        password: "SomethingElse1!",
      })
    );

    expect(duplicate.status).toBe(409);
    expect(mocks.state.users).toHaveLength(1);

    const res = await login(
      jsonRequest("/api/auth/login", {
        email: "ada@example.com",
        password: VALID_PASSWORD,
      })
    );

    expect(res.status).toBe(200);
  });
});

describe("guest/temporary-password creation is unaffected", () => {
  it("still generates and hashes a temporary password for guest cash bookings", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../app/api/marketplace/cash-booking/route.ts"),
      "utf8"
    );

    expect(source).toMatch(
      /passwordService\.hash\(\s*passwordService\.generateTemporaryPassword\(\)/
    );
    expect(source).not.toMatch(/customerRepository/);
  });
});
