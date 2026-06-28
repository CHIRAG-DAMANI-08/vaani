import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";

/**
 * GET /api/key/status
 *
 * Returns the current Sarvam API key status for the authenticated user.
 * Never returns the encrypted key — only the masked display string.
 */
export async function GET() {
  // 1. Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

    const user = await User.findOne(
      { clerkId: userId },
      { sarvamKeyLast4: 1, sarvamKeyUpdatedAt: 1, sarvamKeyEnc: 1 }
    ).lean();

    // No user record or no key stored
    if (!user || !user.sarvamKeyEnc) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        connected: true,
        masked: `sk_live_••••••••${user.sarvamKeyLast4 || "????"}`,
        updatedAt: user.sarvamKeyUpdatedAt
          ? new Date(user.sarvamKeyUpdatedAt).toISOString()
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error, userId }, "Key status check failed");
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}
