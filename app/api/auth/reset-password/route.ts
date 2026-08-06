import { NextRequest } from "next/server";

import { success } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";

export async function POST(
  request: NextRequest
) {
  try {
    await request.json();

    /**
     * TODO
     * Validate Token
     * Validate Password
     * Update Password
     */

    return success(
      null,
      "Password updated successfully."
    );
  } catch (error) {
    return apiError(error);
  }
}