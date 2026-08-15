import { NextRequest, NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";
import { Permission, hasPermission } from "@/lib/permissions";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
  "/api/health",
];

const ACCESS_COOKIE = "ridegrid_access_token";

const API_PERMISSIONS: Array<{
  prefix: string;
  permission: Permission;
}> = [
  { prefix: "/api/bookings", permission: Permission.BOOKING_VIEW },
  { prefix: "/api/customers", permission: Permission.CUSTOMER_VIEW },
  { prefix: "/api/drivers", permission: Permission.DRIVER_VIEW },
  { prefix: "/api/driver", permission: Permission.BOOKING_VIEW },
  { prefix: "/api/vehicles", permission: Permission.VEHICLE_VIEW },
  { prefix: "/api/vendors", permission: Permission.VENDOR_VIEW },
  { prefix: "/api/finance", permission: Permission.FINANCE_VIEW },
  { prefix: "/api/reports", permission: Permission.REPORT_VIEW },
];

function getRequiredPermission(pathname: string) {
  const match = API_PERMISSIONS.find((item) =>
    pathname === item.prefix ||
    pathname.startsWith(`${item.prefix}/`)
  );

  return match?.permission;
}

function getRole(request: NextRequest): string | null {
  const token =
    request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.role !== "string"
    ) {
      return null;
    }

    return decoded.role;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    PUBLIC_API_ROUTES.some(
      (route) => pathname === route
    )
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(ACCESS_COOKIE)?.value;

  if (PUBLIC_ROUTES.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(
        new URL("/", request.url)
      );
    }

    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  if (pathname.startsWith("/api/")) {
    const role = getRole(request);

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token.",
        },
        { status: 401 }
      );
    }

    if (pathname === "/api/admin/test") {
      if (role !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }
    }

    if (
      pathname.startsWith("/api/security/")
    ) {
      if (role !== "SUPER_ADMIN") {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden",
          },
          { status: 403 }
        );
      }
    }

    const permission =
      getRequiredPermission(pathname);

    if (
      permission &&
      !hasPermission(
        role as any,
        permission
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
