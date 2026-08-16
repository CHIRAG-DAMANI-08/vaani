// src/lib/beta-membership.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaMembership } from "@/lib/models/beta-membership";
import { logger } from "@/lib/logger";

/**
 * Dashboard layout guard. Returns an approved membership for the signed-in
 * Clerk user, otherwise redirects:
 *   - no Clerk session → /sign-in
 *   - approved membership not found by clerkUserId → try email-based claim,
 *     and if STILL not approved → /beta/pending
 *
 * The email-based claim folds the plan's separate /api/beta/claim endpoint
 * into the guard itself: an approved applicant who signs in with the same
 * email gets their membership stamped with clerkUserId on first visit and is
 * let through — no extra roundtrip, no duplicate-endpoint surface.
 */
export async function requireMembershipForLayout() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDatabase();

  // Fast path: membership already linked to this Clerk user.
  let membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();

  // Claim path: approved by email but clerkUserId not yet stamped (the
  // approve route creates the row with clerkUserId: null). Resolve the user's
  // Clerker primary email and bind it once.
  if (!membership || membership.status !== "approved") {
    const user = await currentUser();
    const clerkEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
    if (clerkEmail) {
      const byEmail = await BetaMembership.findOne({
        applicationEmail: clerkEmail,
        status: "approved",
      });
      if (byEmail) {
        if (byEmail.clerkUserId && byEmail.clerkUserId !== userId) {
          // Another Clerk account already owns this email. Flag + refuse.
          await BetaMembership.updateOne(
            { _id: byEmail._id },
            { $set: { conflictFlaggedAt: new Date(), conflictingClerkUserId: userId } }
          );
          logger.warn(
            { applicationEmail: clerkEmail, attemptingUserId: userId, ownerUserId: byEmail.clerkUserId },
            "beta membership email conflict — refusing access to second Clerk account"
          );
        } else if (!byEmail.clerkUserId) {
          // Unclaimed approved membership matching this email — bind it now.
          await BetaMembership.updateOne(
            { _id: byEmail._id, clerkUserId: { $in: [null, undefined] } },
            { $set: { clerkUserId: userId, claimedAt: new Date() } }
          );
          membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
        }
      }
    }
  }

  if (!membership || membership.status !== "approved") {
    redirect("/beta/pending");
  }
  return membership;
}

/**
 * Resource-level guard for API routes. Returns minimal identity on success,
 * null otherwise. Does NOT redirect (routes return their own 403).
 */
export async function requireMembership():
  Promise<{ userId: string; email: string; applicationEmail: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  await connectToDatabase();
  const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (!membership || membership.status !== "approved") return null;

  return { userId, email: membership.applicationEmail, applicationEmail: membership.applicationEmail };
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
  const clerkEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
  if (!clerkEmail) {
    return { error: "no verified email on Clerk account", status: 400 };
  }

  await connectToDatabase();

  const membership = await BetaMembership.findOne({
    applicationEmail: clerkEmail,
    status: "approved",
  });

  if (!membership) {
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
    { $set: { clerkUserId: userId, claimedAt: new Date() } }
  );

  return { ok: true };
}
