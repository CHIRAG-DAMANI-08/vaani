import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export default async function AdminRootPage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  redirect("/admin/beta");
}
