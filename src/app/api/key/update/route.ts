import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { sanitizeKey } from "@/lib/sanitize-key";
import { validateSarvamKey } from "@/lib/sarvam";
import { encryptKey } from "@/lib/encryption";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateCSRF } from "@/lib/csrf";

/**
 * POST /api/key/update
 *
 * Flow C — Update existing key.
 * Same pipeline as /validate, but the old key is ONLY replaced
 * if the new key passes Sarvam validation.
 */
export async function POST(request: Request) {
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

  // 3. Rate limit (shared pool with validate)
  const rateResult = checkRateLimit(userId, "key-mutation");
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

  // 4. Parse body
  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "KEY_FORMAT_INVALID", message: "Invalid request body." },
      { status: 400 }
    );
  }

  // 5. Sanitize new key
  const sanitized = sanitizeKey(body.key);
  if (!sanitized.ok) {
    console.log(`[key/update] Sanitization failed for user ${userId}: ${sanitized.code}`);
    return NextResponse.json(
      { error: sanitized.code, message: sanitized.message },
      { status: 400 }
    );
  }

  // 6. Validate new key with Sarvam
  const sarvamResult = await validateSarvamKey(sanitized.key);
  if (!sarvamResult.valid) {
    console.log(`[key/update] Sarvam rejected new key for user ${userId}: ${sarvamResult.error}`);

    if (sarvamResult.error === "KEY_INVALID") {
      return NextResponse.json(
        {
          error: "KEY_INVALID",
          message: "New key rejected by Sarvam. Previous key unchanged.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: "SARVAM_UNREACHABLE",
        message: "Couldn't reach Sarvam right now. Your existing key is still active.",
      },
      { status: 503 }
    );
  }

  // 7. Encrypt new key and overwrite in DB
  try {
    const encrypted = encryptKey(sanitized.key);
    const last4 = sanitized.key.slice(-4);

    await connectToDatabase();
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        sarvamKeyEnc: encrypted,
        sarvamKeyLast4: last4,
        sarvamKeyUpdatedAt: new Date(),
      }
    );

    console.log(`[key/update] Key updated successfully for user ${userId}`);

    return NextResponse.json(
      {
        success: true,
        masked: `sk_live_••••••••${last4}`,
      },
      { status: 200, headers: rateLimitHeaders(rateResult) }
    );
  } catch (error) {
    console.error(`[key/update] Storage failed for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
