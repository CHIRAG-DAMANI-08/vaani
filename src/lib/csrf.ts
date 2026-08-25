import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "__vaani_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a CSRF token bound to a specific user ID.
 * Format: "<userId>:<randomBytesHex>"
 */
export function generateCSRFToken(userId: string): string {
  const randomPart = crypto.randomBytes(32).toString("hex");
  return `${userId}:${randomPart}`;
}

/**
 * Validate CSRF token using double-submit cookie pattern.
 * Also verifies the token is bound to the given userId (if provided).
 *
 * Returns true if valid, false if mismatch, missing, or user mismatch.
 */
export async function validateCSRF(request: Request, userId?: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  const a = Buffer.from(cookieToken, "utf8");
  const b = Buffer.from(headerToken, "utf8");

  if (!crypto.timingSafeEqual(a, b)) {
    return false;
  }

  // If userId is provided, verify the token is bound to this user
  if (userId) {
    const tokenUserId = getUserIdFromToken(cookieToken);
    if (tokenUserId !== userId) {
      return false;
    }
  }

  return true;
}

/**
 * Extract the userId portion from a CSRF token.
 */
export function getUserIdFromToken(token: string): string | null {
  const idx = token.indexOf(":");
  if (idx === -1) return null;
  return token.slice(0, idx);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
