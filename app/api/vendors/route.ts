import { requestUser, staffGuard } from "@/lib/request-access";
import { sendAccountLink } from "@/lib/auth/account-email";
import { deleteVendor } from "@/lib/services/admin/AccountLifecycleService";
import { Permission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import { findIdentityClash, normalizeEmail, normalizeMobile } from "@/lib/auth/identity";

function serializeVendor(vendor: any) {
  return {
    id: vendor.id,
    companyName: vendor.companyName,
    ownerName: vendor.user?.name ?? "",
    mobile: vendor.user?.mobile ?? "",
    email: vendor.user?.email ?? "",

    homeCity: vendor.homeCity ?? "",
    fleetSize: vendor.fleetSize ?? null,
    address: vendor.address ?? "",
    city: vendor.city ?? "",
    state: vendor.state ?? "",
    pinCode: vendor.pinCode ?? "",

    bankName: vendor.bankName ?? "",
    accountNumber: vendor.accountNumber ?? "",
    ifscCode: vendor.ifscCode ?? "",
    branchName: vendor.branchName ?? "",

    totalVehicles: vendor.vehicles?.length ?? 0,
    activeVehicles:
      vendor.vehicles?.filter(
        (vehicle: any) => vehicle.status === "AVAILABLE"
      ).length ?? 0,
    completedTrips:
      vendor.bookings?.filter(
        (booking: any) => booking.status === "TRIP_COMPLETED"
      ).length ?? 0,

    totalEarnings: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
      vendor.bookings?.filter((b: any) => b.status === "TRIP_COMPLETED").reduce((sum: number, b: any) => sum + Number(b.vendorEarning ?? 0), 0) ?? 0
    ),
    pendingPayment: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.max(0,
      (vendor.bookings?.filter((b: any) => b.status === "TRIP_COMPLETED").reduce((sum: number, b: any) => sum + Number(b.vendorEarning ?? 0), 0) ?? 0) -
      (vendor.settlements?.reduce((sum: number, s: any) => sum + Number(s.netAmount ?? 0), 0) ?? 0)
    )),
    rating: vendor.reviews?.length ? vendor.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / vendor.reviews.length : 0,
    status: vendor.isApproved ? "Active" : "Pending",
    joinedDate: new Date(vendor.createdAt).toLocaleDateString("en-IN"),
  };
}

const vendorInclude = {
  user: { select: { name: true, mobile: true, email: true } },
  settlements: { where: { settlementStatus: "COMPLETED" as const }, select: { netAmount: true } },
  reviews: { where: { status: "PUBLISHED" as const }, select: { rating: true } },
  vehicles: {
    where: {
      deletedAt: null,
    },
  },
  bookings: {
    where: {
      deletedAt: null,
    },
    select: {
      status: true,
      vendorEarning: true,
    },
  },
};

export async function GET(req: NextRequest) {
  const denied = await staffGuard(req, Permission.VENDOR_VIEW); if (denied) return denied;
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const city = searchParams.get("city")?.trim() || "";

    const vendors = await prisma.vendor.findMany({
      where: {
        deletedAt: null,
        ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),

        ...(status === "Active"
          ? { isApproved: true }
          : status === "Pending"
            ? { isApproved: false }
            : {}),

        ...(search
          ? {
              OR: [
                {
                  companyName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    mobile: {
                      contains: search,
                    },
                  },
                },
              ],
            }
          : {}),
      },

      include: vendorInclude,

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: vendors.map(serializeVendor),
    });
  } catch (error) {
    console.error("GET /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load vendors.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await staffGuard(req, Permission.VENDOR_MANAGE); if (denied) return denied;
  try {
    const body = await req.json();

    const documents = body.documents ?? {};

    const {
      companyName,
      ownerName,
      mobile,
      email,
      homeCity,
      fleetSize,
      address,
      city,
      state,
      pinCode,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
    } = body;

    if (
      !companyName?.trim() ||
      !ownerName?.trim() ||
      !mobile?.trim() ||
      !email?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Company, owner, mobile and email are required.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedMobile = normalizeMobile(mobile) as string;

    // Only another active VENDOR blocks: the same email/mobile may belong to a customer etc.
    const clash = await findIdentityClash({ role: "VENDOR", email: normalizedEmail, mobile: normalizedMobile });
    if (clash) {
      return NextResponse.json(
        {
          success: false,
          message:
            clash === "email"
              ? "A vendor with this email already exists."
              : "A vendor with this mobile number already exists.",
        },
        { status: 409 }
      );
    }

    // A unique temporary password is shown once to the Super Admin; the first sign-in
    // with it forces the vendor to choose a new one. The activation email also works.
    const temporaryPassword = passwordService.generateTemporaryPassword(12);
    const hashedPassword = await passwordService.hash(temporaryPassword);

    const vendor = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: ownerName.trim(),
          email: normalizedEmail,
          mobile: normalizedMobile,
          password: hashedPassword,
          mustChangePassword: true,
          role: "VENDOR",
          isActive: true,
          isVerified: false,
        },
      });

      const createdVendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName: companyName.trim(),

          homeCity: homeCity?.trim() || null,
          fleetSize:
            fleetSize !== undefined &&
            fleetSize !== null &&
            String(fleetSize).trim() !== ""
              ? Number(fleetSize)
              : null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pinCode: pinCode?.trim() || null,

          bankName: bankName?.trim() || null,
          accountNumber: accountNumber?.trim() || null,
          ifscCode: ifscCode?.trim().toUpperCase() || null,
          branchName: branchName?.trim() || null,

          isApproved: false,
        },
        include: vendorInclude,
      });

      const documentInputs = [
        { type: "AADHAAR", file: documents.aadhaarCard },
        { type: "PAN", file: documents.panCard },
        { type: "OTHER", file: documents.cancelledCheque },
      ];

      for (const item of documentInputs) {
        if (item.file?.fileName && item.file?.fileUrl) {
          await tx.vendorDocument.create({
            data: {
              vendorId: createdVendor.id,
              documentType: item.type,
              fileUrl: item.file.fileUrl,
              status: "PENDING",
            },
          });
        }
      }
      return createdVendor;
    });

    // Activation email goes out only after the vendor and its login are committed.
    const activation = await sendAccountLink(
      { id: vendor.userId, email: normalizedEmail, name: ownerName.trim() },
      "ACTIVATION",
      "Vendor"
    );

    return NextResponse.json(
      {
        success: true,
        message: activation.sent
          ? `Vendor created. An activation email was sent to ${normalizedEmail}.`
          : `Vendor created, but the activation email was not sent (${activation.reason ?? "unknown reason"}). Share the temporary password or use Forgot Password.`,
        data: { ...serializeVendor(vendor), activationEmailSent: activation.sent, temporaryPassword },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create vendor.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await staffGuard(req, Permission.VENDOR_MANAGE); if (denied) return denied;
  try {
    const body = await req.json();

    const {
      id,
      companyName,
      ownerName,
      mobile,
      email,
      homeCity,
      fleetSize,
      address,
      city,
      state,
      pinCode,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!vendor || vendor.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor not found.",
        },
        { status: 404 }
      );
    }

    const nextEmail = typeof email === "string" ? normalizeEmail(email) : undefined;
    const nextMobile = typeof mobile === "string" ? normalizeMobile(mobile) ?? undefined : undefined;
    if ((nextEmail && nextEmail !== vendor.user.email) || (nextMobile && nextMobile !== vendor.user.mobile)) {
      const clash = await findIdentityClash({ role: "VENDOR", email: nextEmail, mobile: nextMobile, exceptUserId: vendor.userId });
      if (clash) {
        return NextResponse.json({ success: false, message: clash === "email" ? "Another vendor already uses this email." : "Another vendor already uses this mobile number." }, { status: 409 });
      }
    }
    const actorId = (await requestUser(req))?.id ?? null;

    const updatedVendor = await prisma.$transaction(async (tx: any) => {
      const userData: any = {};

      if (ownerName !== undefined) {
        userData.name = ownerName;
      }

      if (mobile !== undefined) {
        userData.mobile = normalizeMobile(mobile);
      }

      if (email !== undefined) {
        userData.email = normalizeEmail(email);
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: vendor.userId },
          data: userData,
        });
      }

      const vendorData: any = {};

      if (companyName !== undefined) {
        vendorData.companyName = companyName;
      }

      if (homeCity !== undefined) {
        vendorData.homeCity = homeCity || null;
      }

      if (fleetSize !== undefined) {
        vendorData.fleetSize =
          fleetSize === null ||
          String(fleetSize).trim() === ""
            ? null
            : Number(fleetSize);
      }

      if (address !== undefined) {
        vendorData.address = address || null;
      }

      if (city !== undefined) {
        vendorData.city = city || null;
      }

      if (state !== undefined) {
        vendorData.state = state || null;
      }

      if (pinCode !== undefined) {
        vendorData.pinCode = pinCode || null;
      }

      if (bankName !== undefined) {
        vendorData.bankName = bankName || null;
      }

      if (accountNumber !== undefined) {
        vendorData.accountNumber = accountNumber || null;
      }

      if (ifscCode !== undefined) {
        vendorData.ifscCode = ifscCode
          ? ifscCode.toUpperCase()
          : null;
      }

      if (branchName !== undefined) {
        vendorData.branchName = branchName || null;
      }

      // Verification/suspension are dedicated audited actions
      // (POST /api/admin/vendors/{id}); the edit form never changes them.
      void status;

      await tx.auditLog.create({
        data: {
          userId: actorId, action: "UPDATE", entityName: "Vendor", entityId: id,
          newValue: { event: "PROFILE_UPDATED", fields: [...Object.keys(userData), ...Object.keys(vendorData)] },
        },
      });

      return tx.vendor.update({
        where: { id },
        data: vendorData,
        include: vendorInclude,
      });
    });

    return NextResponse.json({
      success: true,
      message: "Vendor updated successfully.",
      data: serializeVendor(updatedVendor),
    });
  } catch (error) {
    console.error("PUT /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update vendor.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await staffGuard(req, Permission.VENDOR_MANAGE); if (denied) return denied;
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    // Safe archival: login disabled, email/mobile released, history preserved.
    const actorId = (await requestUser(req))!.id;
    await deleteVendor(id, actorId, req.nextUrl.searchParams.get("reason") || undefined);

    return NextResponse.json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    if (error instanceof Error && "status" in error && typeof (error as { status: unknown }).status === "number")
      return NextResponse.json({ success: false, message: error.message }, { status: (error as { status: number }).status });
    console.error("DELETE /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete vendor.",
      },
      { status: 500 }
    );
  }
}
