import { auth, currentUser } from "@clerk/nextjs/server";

// damanichiru38@gmail.com is and always will be the primary admin email
const PERMANENT_ADMIN_EMAILS = ["damanichiru38@gmail.com"];

const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALL_ADMIN_EMAILS = Array.from(
  new Set([...PERMANENT_ADMIN_EMAILS, ...ENV_ADMIN_EMAILS])
);

export function getAdminEmails(): string[] {
  return ALL_ADMIN_EMAILS;
}

export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ALL_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await currentUser();
  if (!user) return false;

  const userEmails = [
    user.primaryEmailAddress?.emailAddress,
    ...(user.emailAddresses || []).map((e) => e.emailAddress),
  ]
    .filter(Boolean)
    .map((e) => e!.toLowerCase().trim());

  return userEmails.some((email) => ALL_ADMIN_EMAILS.includes(email));
}

export async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const userEmails = [
    user.primaryEmailAddress?.emailAddress,
    ...(user.emailAddresses || []).map((e) => e.emailAddress),
  ]
    .filter(Boolean)
    .map((e) => e!.toLowerCase().trim());

  const matchingEmail = userEmails.find((email) => ALL_ADMIN_EMAILS.includes(email));
  if (!matchingEmail) return null;

  return { userId, email: matchingEmail };
}