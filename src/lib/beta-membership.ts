// src/lib/beta-membership.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaMembership } from "@/lib/models/beta-membership";

export async function requireMembershipForLayout() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDatabase();
  const membership = await BetaMembership.findOne({ clerkUserId: userId }).lean();
  if (!membership || membership.status !== "approved") {
    redirect("/beta/pending");
  }
  return membership;
}

export async function requireMembership(): Promise<{ userId: string; email: string; applicationEmail: string } | null> {
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
      {
        $set: {
          conflictFlaggedAt: new Date(),
          conflictingClerkUserId: userId
        }
      }
    );
    return { error: "this email is already claimed by another Clerk account", status: 409 };
  }

  await BetaMembership.updateOne(
    { _id: membership._id },
    {
      $set: {
        clerkUserId: userId,
        claimedAt: new Date()
      }
    }
  );

  return { ok: true };
}