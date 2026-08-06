import { NextRequest } from "next/server";

import { authenticate } from "@/lib/auth/middleware";
import { success, failure } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.headers
        .get("authorization")
        ?.replace("Bearer ", "");

    const user = await authenticate(token);

    if (!user) {
      return failure(
        "Unauthorized",
        401
      );
    }

    return success(user);
  } catch (error) {
    return apiError(error);
  }
}