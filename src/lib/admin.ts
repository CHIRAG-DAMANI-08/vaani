import { auth, currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "damanichiru38@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
  return email ? ADMIN_EMAILS.includes(email) : false;
}

export async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim();
  if (!email || !ADMIN_EMAILS.includes(email)) return null;

  return { userId, email };
}