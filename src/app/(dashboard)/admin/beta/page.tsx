import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/mongodb";
import { BetaApplication } from "@/lib/models/beta-application";
import { AdminDashboardOverview } from "@/app/components/admin/AdminDashboardOverview";

export default async function AdminBetaPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  await connectToDatabase();
  const rawApps = await BetaApplication.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const initialApplications = rawApps.map((doc: any) => ({
    _id: doc._id.toString(),
    email: doc.email,
    name: doc.name || undefined,
    interests: doc.interests || [],
    youtubeChannel: doc.youtubeChannel || undefined,
    channelTitle: doc.channelTitle || undefined,
    subscriberCount: doc.subscriberCount || undefined,
    channelAvatar: doc.channelAvatar || undefined,
    obsSetup: doc.obsSetup || "using_obs",
    sarvamPreference: doc.sarvamPreference || "need_key",
    reason: doc.reason || undefined,
    streamFrequency: doc.streamFrequency || "5 streams/wk",
    status: doc.status || "pending",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  }));

  return <AdminDashboardOverview initialApplications={initialApplications} />;
}