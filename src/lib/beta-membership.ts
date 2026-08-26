// src/lib/beta-membership.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaMembership } from "@/lib/models/beta-membership";
import { BetaApplication } from "@/lib/models/beta-application";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/admin";

/**
 * Dashboard layout guard. Returns an approved membership for the signed-in
 * Clerk user, otherwise redirects:
 *   - no Clerk session → /sign-in
 *   - approved membership not found by clerkUserId → try email-based claim,
 *     and if STILL not approved → /beta/pending
 */
export async function requireMembershipForLayout() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Admins bypass beta membership checks entirely
  if (await isAdmin()) return { status: "approved", applicationEmail: "admin" } as any;

  await connectToDatabase();

  // Fast path: membership already linked to this Clerk user.
  let membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (membership && membership.status === "approved") {
    return membership;
  }

  // Claim path: resolve user emails from Clerk session and check BetaMembership & BetaApplication
  try {
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
      // 1. Check BetaMembership by email
      const byEmail = await BetaMembership.findOne({
        applicationEmail: { $in: emails },
        status: "approved",
      });

      if (byEmail) {
        await BetaMembership.updateOne(
          { _id: byEmail._id },
          { $set: { clerkUserId: userId, status: "approved", claimedAt: new Date() } }
        );
        membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
        if (membership && membership.status === "approved") {
          return membership;
        }
        return { status: "approved", applicationEmail: byEmail.applicationEmail };
      }

      // 2. Fallback check: Direct lookup on BetaApplication
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
            $set: {
              clerkUserId: userId,
              status: "approved",
              claimedAt: new Date(),
            },
            $setOnInsert: {
              applicationEmail: appEmail,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
        if (membership && membership.status === "approved") {
          return membership;
        }
        return { status: "approved", applicationEmail: appEmail };
      }
    }
  } catch (err) {
    logger.error({ err, userId }, "Error resolving beta membership claim");
  }

  redirect("/beta/pending");
}

/**
 * Resource-level guard for API routes. Returns minimal identity on success,
 * null otherwise. Does NOT redirect (routes return their own 403).
 */
export async function requireMembership():
  Promise<{ userId: string; email: string; applicationEmail: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  if (await isAdmin()) {
    return { userId, email: "admin", applicationEmail: "admin" };
  }

  await connectToDatabase();
  const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (membership && membership.status === "approved") {
    return { userId, email: membership.applicationEmail, applicationEmail: membership.applicationEmail };
  }

  // Check emails fallback
  try {
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
        return { userId, email: appEmail, applicationEmail: appEmail };
      }
    }
  } catch {
    // Silently fall through
  }

  return null;
}

export async function claimMembership(
  userId: string,
  _unused: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const { userId: authUserId } = await auth();
  if (!authUserId || authUserId !== userId) {
    return { error: "unauthorized", status: 401 };
  }

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

  if (emails.length === 0) {
    return { error: "no verified email on Clerk account", status: 400 };
  }

  await connectToDatabase();

  const membership = await BetaMembership.findOne({
    applicationEmail: { $in: emails },
    status: "approved",
  });

  if (!membership) {
    // Check BetaApplication
    const approvedApp = await BetaApplication.findOne({
      $or: [{ email: { $in: emails } }, { normalizedEmail: { $in: emails } }],
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
      return { ok: true };
    }

    return { error: "no approved membership for this email", status: 403 };
  }

  if (membership.clerkUserId && membership.clerkUserId !== userId) {
    await BetaMembership.updateOne(
      { _id: membership._id },
      { $set: { conflictFlaggedAt: new Date(), conflictingClerkUserId: userId } }
    );
    return { error: "this email is already claimed by another Clerk account", status: 409 };
  }

  await BetaMembership.updateOne(
    { _id: membership._id },
    { $set: { clerkUserId: userId, status: "approved", claimedAt: new Date() } }
  );

  return { ok: true };
}
