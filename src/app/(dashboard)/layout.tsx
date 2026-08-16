import { requireMembershipForLayout } from "@/lib/beta-membership";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMembershipForLayout();
  return <DashboardShell>{children}</DashboardShell>;
}