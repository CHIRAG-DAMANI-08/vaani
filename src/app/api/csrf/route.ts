import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCSRFToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

/**
 * GET /api/csrf
 *
 * Issues a CSRF token bound to the authenticated Clerk user.
 * Token is set as an HttpOnly cookie and returned in the JSON body.
 * Requires an authenticated session — rejects unauthenticated requests.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const token = generateCSRFToken(userId);

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
