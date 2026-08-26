import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { BetaMembership } from "@/lib/models/beta-membership";
import { BetaApplication } from "@/lib/models/beta-application";

/**
 * GET /api/key/status
 *
 * Returns the current Sarvam API key status and beta application preferences
 * (obsSetup, sarvamPreference) for the authenticated user.
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
      {
        sarvamKeyLast4: 1,
        sarvamKeyUpdatedAt: 1,
        sarvamKeyEnc: 1,
        onboardingComplete: 1,
      }
    ).lean();

    // Resolve user beta application preferences
    let obsSetup: "using_obs" | "needs_guide" = "using_obs";
    let sarvamPreference: "need_key" | "bring_own" = "need_key";
    let applicantName: string | null = null;

    try {
      const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
      let emailToLookup = membership?.applicationEmail;

      if (!emailToLookup) {
        const clerkUser = await currentUser();
        emailToLookup = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
      }

      if (emailToLookup) {
        const betaApp = await BetaApplication.findOne({
          $or: [
            { normalizedEmail: emailToLookup.toLowerCase().trim() },
            { email: emailToLookup.toLowerCase().trim() },
          ],
        }).lean();

        if (betaApp) {
          if (betaApp.obsSetup === "needs_guide" || betaApp.obsSetup === "using_obs") {
            obsSetup = betaApp.obsSetup;
          }
          if (betaApp.sarvamPreference === "need_key" || betaApp.sarvamPreference === "bring_own") {
            sarvamPreference = betaApp.sarvamPreference;
          }
          if (betaApp.name) {
            applicantName = betaApp.name;
          }
        }
      }
    } catch (prefErr) {
      logger.warn({ err: prefErr, userId }, "Failed to resolve beta preferences in key status");
    }

    // No user record or no key stored
    if (!user || !user.sarvamKeyEnc) {
      return NextResponse.json(
        {
          connected: false,
          onboardingComplete: !!user?.onboardingComplete,
          obsSetup,
          sarvamPreference,
          applicantName,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        connected: true,
        onboardingComplete: !!user.onboardingComplete,
        masked: `sk_live_••••••••${user.sarvamKeyLast4 || "????"}`,
        updatedAt: user.sarvamKeyUpdatedAt
          ? new Date(user.sarvamKeyUpdatedAt).toISOString()
          : null,
        obsSetup,
        sarvamPreference,
        applicantName,
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
