import { NextRequest } from "next/server";

import { success } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    /**
     * TODO
     * Verify Email
     * Generate Reset Token
     * Send Email
     */

    return success(
      body.email,
      "Password reset link sent."
    );
  } catch (error) {
    return apiError(error);
  }
}