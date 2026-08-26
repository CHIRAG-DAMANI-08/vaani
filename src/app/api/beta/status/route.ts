import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaMembership } from "@/lib/models/beta-membership";
import { BetaApplication } from "@/lib/models/beta-application";
import { isAdmin } from "@/lib/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/beta/status
 *
 * Checks if the currently authenticated user has an approved beta status.
 * If approved, automatically stamps clerkUserId and returns { approved: true }.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ authenticated: false, approved: false }, { status: 200 });
  }

  if (await isAdmin()) {
    return NextResponse.json({ authenticated: true, approved: true, isAdmin: true }, { status: 200 });
  }

  try {
    await connectToDatabase();

    // 1. Check existing BetaMembership
    let membership = await BetaMembership.findOne({ clerkUserId: userId, status: "approved" }).lean();
    if (membership) {
      return NextResponse.json({ authenticated: true, approved: true }, { status: 200 });
    }

    // 2. Check user emails from Clerk
    const user = await currentUser();
    const emails: string[] = [];
    if (user?.primaryEmailAddress?.emailAddress) {
      emails.push(user.primaryEmailAddress.emailAddress.toLowerCase().trim());
    }
    if (user?.emailAddresses && Array.isArray(user.emailAddresses)) {
      for (const e of user.emailAddresses) {
        if (e?.emailAddress) {
          const clean = e.emailAddress.toLowerCase().trim();
          if (!emails.includes(clean)) emails.push(clean);
        }
      }
    }

    if (emails.length > 0) {
      // Check BetaMembership by email
      const byEmail = await BetaMembership.findOne({
        applicationEmail: { $in: emails },
        status: "approved",
      });

      if (byEmail) {
        await BetaMembership.updateOne(
          { _id: byEmail._id },
          { $set: { clerkUserId: userId, status: "approved", claimedAt: new Date() } }
        );
        return NextResponse.json({ authenticated: true, approved: true }, { status: 200 });
      }

      // Check BetaApplication by email
      const approvedApp = await BetaApplication.findOne({
        $or: [
          { email: { $in: emails } },
          { normalizedEmail: { $in: emails } },
        ],
        status: "approved",
      }).lean();

      if (approvedApp) {
        const appEmail = (approvedApp.email || emails[0]).toLowerCase().trim();
        await BetaMembership.findOneAndUpdate(
          { applicationEmail: appEmail },
          {
            $set: { clerkUserId: userId, status: "approved", claimedAt: new Date() },
            $setOnInsert: { applicationEmail: appEmail, createdAt: new Date() },
          },
          { upsert: true }
        );
        return NextResponse.json({ authenticated: true, approved: true }, { status: 200 });
      }
    }

    return NextResponse.json({ authenticated: true, approved: false }, { status: 200 });
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to check beta status");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
