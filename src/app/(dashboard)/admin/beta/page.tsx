import { BetaApplicationsTable } from "@/app/components/admin/BetaApplicationsTable";

export default function AdminBetaPage() {
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