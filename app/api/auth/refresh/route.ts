import { NextRequest } from "next/server";

import { authService } from "@/lib/auth/auth";
import { success, failure } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    if (!body.refreshToken) {
      return failure(
        "Refresh token is required.",
        400
      );
    }

    const token = await authService.refresh(
      body.refreshToken
    );

    return success(token);
  } catch (error) {
    return apiError(error);
  }
}