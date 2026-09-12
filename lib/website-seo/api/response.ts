import { NextResponse } from "next/server";

export function websiteSeoApiSuccess<T>(
  data: T,
  status = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function websiteSeoApiError(
  error: string,
  status = 500
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}
