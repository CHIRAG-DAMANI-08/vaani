import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateCSRF } from "@/lib/csrf";

/**
 * DELETE /api/key
 *
 * Flow D — Remove key.
 * Sets all key columns to NULL. Hard delete, no soft-delete.
 */
export async function DELETE(request: Request) {
  // 1. Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // 2. CSRF check
  const csrfValid = await validateCSRF(request);
  if (!csrfValid) {
    return NextResponse.json(
      { error: "CSRF_INVALID", message: "Something went wrong. Please refresh and try again." },
      { status: 403 }
    );
  }

  // 3. Rate limit (separate pool for deletion)
  const rateResult = checkRateLimit(userId, "key-delete");
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: rateResult.retryAfterSeconds,
        message: `Too many attempts. Try again in ${Math.ceil(rateResult.retryAfterSeconds / 60)} minutes.`,
      },
      { status: 429, headers: rateLimitHeaders(rateResult) }
    );
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user || !user.sarvamKeyEnc) {
      return NextResponse.json(
        { error: "KEY_NOT_FOUND", message: "No key found to remove." },
        { status: 404 }
      );
    }

    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        sarvamKeyEnc: null,
        sarvamKeyLast4: null,
        sarvamKeyUpdatedAt: null,
      }
    );

    console.log(`[key/delete] Key removed for user ${userId}`);

    return NextResponse.json(
      { success: true },
      { status: 200, headers: rateLimitHeaders(rateResult) }
    );
  } catch (error) {
    console.error(`[key/delete] Failed for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
