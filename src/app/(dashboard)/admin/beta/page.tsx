import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { BetaApplicationsTable } from "@/app/components/admin/BetaApplicationsTable";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "damanichiru38@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminBetaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectToDatabase();
  const user = await User.findOne({ clerkId: userId }).lean();
  const email = user?.email?.toLowerCase?.();

  if (!email || !ADMIN_EMAILS.includes(email)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-none">
          Beta <span className="font-serif italic font-normal">Applications</span>
        </h1>
        <p className="text-sm font-sans text-neutral-400 mt-2">
          Review and approve beta waitlist signups.
        </p>
      </div>

      <BetaApplicationsTable />
    </div>
  );
}