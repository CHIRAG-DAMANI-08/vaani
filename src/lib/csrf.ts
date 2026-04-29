import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "__vaani_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically random CSRF token.
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate CSRF token using double-submit cookie pattern.
 * Compares the token from the cookie with the token from the request header.
 *
 * Returns true if valid, false if mismatch or missing.
 */
export async function validateCSRF(request: Request): Promise<boolean> {
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

  return crypto.timingSafeEqual(a, b);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
