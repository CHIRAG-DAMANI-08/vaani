import { NextResponse } from "next/server";
import { generateCSRFToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

/**
 * GET /api/csrf
 *
 * Issues a CSRF token as both:
 *  - An HttpOnly cookie (for server-side validation)
 *  - A JSON body value (for client-side header inclusion)
 */
export async function GET() {
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
