import { NextResponse } from "next/server";
import { generateCSRFToken, CSRF_COOKIE_NAME } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/csrf
 *
 * Issues a CSRF token as both:
 *  - An HttpOnly cookie (for server-side validation)
 *  - A JSON body value (for client-side header inclusion)
 */
export async function GET(req: Request) {
  // Rate limit: 30 per minute per IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`csrf:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.remainingMs / 1000)) } });
  }

  const token = generateCSRFToken();

  const response = NextResponse.json({ csrfToken: token });

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
