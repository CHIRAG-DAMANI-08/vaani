"use client";

import { useState, useEffect, useCallback } from "react";
import { CircleNotch, Database, Tray, Users, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BetaApplicationRow } from "./BetaApplicationRow";
import { AdminToolbar } from "./AdminToolbar";

export function BetaApplicationsTable() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        status,
        search,
        page: String(page),
        limit: "25",
      });
      const res = await fetch(`/api/admin/beta-applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data.applications || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || (data.applications?.length || 0));
    } catch (err: any) {
      setError(err?.message || "Failed to load applications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const targetApp = applications.find((a) => a._id === id);

    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app._id === id ? { ...app, status: "approved" } : app))
    );

    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      if (data.wasRestored) {
        toast.success(
          data.emailSent
            ? `Restored access for ${targetApp?.email || "user"} — notification email sent!`
            : `Restored access for ${targetApp?.email || "user"}`
        );
      } else {
        toast.success(
          data.emailSent
            ? `Approved ${targetApp?.email || "applicant"} — invitation email sent with signup link!`
            : `Approved ${targetApp?.email || "applicant"}`
        );
      }
      fetchApplications(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve application");
      fetchApplications(true);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    const targetApp = applications.find((a) => a._id === id);
    const isRevoke = targetApp?.status === "approved";

    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app._id === id ? { ...app, status: "rejected" } : app))
    );

    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operation failed");

      if (isRevoke) {
        toast.success(
          data.emailSent
            ? `Revoked access for ${targetApp?.email || "user"} — revocation email sent.`
            : `Revoked access for ${targetApp?.email || "user"}`
        );
      } else {
        toast.success(
          data.emailSent
            ? `Rejected ${targetApp?.email || "applicant"} — capacity notice email sent.`
            : `Rejected ${targetApp?.email || "applicant"}`
        );
      }
      fetchApplications(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update application");
      fetchApplications(true);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ status, search });
      const res = await fetch(`/api/admin/beta-applications/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaani-beta-applications-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  // Metric counts
  const pendingCount = applications.filter((a) => a.status === "pending" || a.status === "review").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="liquid-glass border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Users size={18} strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">Total</p>
            <p className="text-xl font-sans font-bold text-white leading-tight">{totalCount}</p>
          </div>
        </div>

        <div className="liquid-glass border border-amber-500/20 bg-amber-500/[0.03] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-300 shrink-0">
            <Clock size={18} strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">Pending</p>
            <p className="text-xl font-sans font-bold text-amber-300 leading-tight">{pendingCount}</p>
          </div>
        </div>

        <div className="liquid-glass border border-[#2DD4BF]/20 bg-[#2DD4BF]/[0.03] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
            <CheckCircle size={18} weight="fill" />
          </div>
          <div>
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">Approved</p>
            <p className="text-xl font-sans font-bold text-[#2DD4BF] leading-tight">{approvedCount}</p>
          </div>
        </div>

        <div className="liquid-glass border border-red-500/20 bg-red-500/[0.03] rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
            <XCircle size={18} weight="fill" />
          </div>
          <div>
            <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">Rejected</p>
            <p className="text-xl font-sans font-bold text-red-400 leading-tight">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <AdminToolbar
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        onExport={handleExport}
        onRefresh={() => fetchApplications(true)}
        isRefreshing={refreshing}
      />

      {/* Main Content Area */}
      {loading && applications.length === 0 ? (
        <div className="liquid-glass border border-white/10 rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
          <CircleNotch className="w-6 h-6 text-[#2DD4BF] animate-spin" />
          <p className="text-sm font-sans text-neutral-400">Loading live applications from database...</p>
        </div>
      ) : error ? (
        <div className="liquid-glass border border-red-500/30 rounded-2xl p-8 text-center text-red-400 space-y-3">
          <Database size={36} className="mx-auto text-red-400" />
          <p className="font-sans font-medium">{error}</p>
          <button
            onClick={() => fetchApplications(false)}
            className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-200 cursor-pointer transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="liquid-glass border border-white/10 rounded-2xl p-16 text-center space-y-2">
          <Tray size={44} className="mx-auto text-neutral-500" />
          <p className="font-sans text-base font-bold text-white">No applications found</p>
          <p className="text-xs font-sans text-neutral-400">
            {search || status !== "all"
              ? "Try resetting your search query or status filter."
              : "Waitlist signups and beta applications will show up here live."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block liquid-glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      ID
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      Applicant
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      Languages
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      Applied
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {applications.map((app) => (
                    <BetaApplicationRow
                      key={app._id}
                      application={app}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      isProcessing={processingId === app._id}
                      variant="table"
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {applications.map((app) => (
              <BetaApplicationRow
                key={app._id}
                application={app}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingId === app._id}
                variant="card"
              />
            ))}
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-sans text-neutral-400">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="liquid-glass border border-white/10 rounded-full px-4 py-1.5 text-xs font-sans text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="liquid-glass border border-white/10 rounded-full px-4 py-1.5 text-xs font-sans text-neutral-300 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}