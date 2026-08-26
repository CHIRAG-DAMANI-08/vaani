import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { logger } from "@/lib/logger";

/**
 * POST /api/onboarding/complete
 *
 * Marks onboardingComplete: true on the User document.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: { clerkId: userId, onboardingComplete: true } },
      { upsert: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to mark onboarding complete");
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to mark onboarding complete" },
      { status: 500 }
    );
  }
}
