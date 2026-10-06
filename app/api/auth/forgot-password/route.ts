import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";
import { sendAccountLink, type RoleLabel } from "@/lib/auth/account-email";
import { identifierWhere, parseRole } from "@/lib/auth/identity";

const RESEND_COOLDOWN_MS = 60_000;
const ROLE_LABEL: Record<string, RoleLabel> = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  DRIVER: "Driver",
  CORPORATE_EMPLOYEE: "Corporate Employee",
  CORPORATE_ADMIN: "Corporate Admin",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Email address or mobile number; "email" is accepted from older clients.
    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : typeof body.email === "string"
          ? body.email.trim()
          : "";
    const role = parseRole(body.role);

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message: "Email or mobile number is required.",
        },
        { status: 400 }
      );
    }

    // The same email/mobile may belong to several roles; each account gets its own
    // link (the app passes its role to limit this to one).
    const users = await prisma.user.findMany({
      where: { ...identifierWhere(identifier), deletedAt: null, isActive: true, ...(role ? { role } : {}) },
      take: 5,
    });

    // The response never reveals whether an account exists.
    for (const user of users) {
      // One link per minute per account: stops the endpoint being used to flood an inbox.
      const recent = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
        select: { id: true },
      });
      if (!recent) {
        // Failure to deliver is recorded in the notification log; the response stays
        // identical either way so account existence is not revealed.
        await sendAccountLink(user, "RESET", ROLE_LABEL[user.role] ?? "RideGrid");
      }
    }

    return success(
      null,
      "If the account exists, a password reset link has been requested."
    );
  } catch (error) {
    return apiError(error);
  }
}
