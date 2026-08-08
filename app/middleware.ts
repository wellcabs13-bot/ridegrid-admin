import {
  NextRequest,
  NextResponse,
} from "next/server";

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
];

export function middleware(
  request: NextRequest
) {
  const {
    pathname,
  } = request.nextUrl;

  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (
    PUBLIC_API_ROUTES.some(
      (route) =>
        pathname === route
    )
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      "ridegrid-token"
    )?.value;

  if (
    PUBLIC_ROUTES.includes(
      pathname
    )
  ) {
    if (token) {
      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
      );
    }

    return NextResponse.next();
  }

  if (!token) {
    if (
      pathname.startsWith(
        "/api/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};