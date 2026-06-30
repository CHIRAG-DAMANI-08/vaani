import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { sanitizeKey } from "@/lib/sanitize-key";
import { logger } from "@/lib/logger";
import { validateSarvamKey } from "@/lib/sarvam";
import { encryptKey } from "@/lib/encryption";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateCSRF } from "@/lib/csrf";

/**
 * POST /api/key/validate
 *
 * Flow A — First-time key entry (onboarding) or add-key from Settings.
 * Sanitize → rate-limit → validate with Sarvam → encrypt → store → 200
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

  // 3. Rate limit check
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

  // 5. Sanitize key
  const sanitized = sanitizeKey(body.key);
  if (!sanitized.ok) {
    logger.warn({ userId, code: sanitized.code }, "Key sanitization failed");
    return NextResponse.json(
      { error: sanitized.code, message: sanitized.message },
      { status: 400 }
    );
  }

  // 6. Validate with Sarvam
  const sarvamResult = await validateSarvamKey(sanitized.key);
  if (!sarvamResult.valid) {
    logger.warn({ userId, reason: sarvamResult.error }, "Key rejected by Sarvam");

    if (sarvamResult.error === "KEY_INVALID") {
      return NextResponse.json(
        { error: "KEY_INVALID", message: "This key wasn't accepted by Sarvam. Check it's copied correctly." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "SARVAM_UNREACHABLE", message: "Couldn't reach Sarvam right now. Your key hasn't been saved. Try again in a moment." },
      { status: 503 }
    );
  }

  // 7. Encrypt and store
  try {
    const encrypted = encryptKey(sanitized.key);
    const last4 = sanitized.key.slice(-4);

    await connectToDatabase();
    await User.findOneAndUpdate(
      { clerkId: userId },
      {
        clerkId: userId,
        sarvamKeyEnc: encrypted,
        sarvamKeyLast4: last4,
        sarvamKeyUpdatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info({ userId }, "Key stored successfully");

    return NextResponse.json(
      { success: true },
      { status: 200, headers: rateLimitHeaders(rateResult) }
    );
  } catch (error) {
    logger.error({ err: error, userId }, "Key storage failed");
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
