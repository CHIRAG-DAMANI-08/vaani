"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Database, Inbox } from "lucide-react";
import { BetaApplicationRow } from "./BetaApplicationRow";
import { AdminToolbar } from "./AdminToolbar";

interface BetaApplicationsTableProps {}

export function BetaApplicationsTable() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        search,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/admin/beta-applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setApplications(data.applications || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [status, search, page]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
      fetchApplications();
    } catch {
      alert("Failed to approve application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/beta-applications/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reject");
      fetchApplications();
    } catch {
      alert("Failed to reject application");
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
      a.download = `beta-applications-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
        <p className="text-sm font-sans text-neutral-400">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass border border-red-500/30 rounded-xl p-6 text-center text-red-400">
        <Database size={32} className="mx-auto mb-3 text-red-500" />
        <p className="font-sans">{error}</p>
        <button onClick={fetchApplications} className="mt-3 px-4 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200">
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="liquid-glass border border-white/10 rounded-xl p-12 text-center">
        <Inbox size={48} className="mx-auto mb-4 text-neutral-500" />
        <p className="font-sans text-neutral-400">No applications found</p>
        <p className="text-xs text-neutral-500 mt-1">Adjust filters or wait for new signups</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        status={status}
        onStatusChange={(s) => { setStatus(s); setPage(1); }}
        search={search}
        onSearchChange={(s) => { setSearch(s); setPage(1); }}
        onExport={handleExport}
      />

      <div className="liquid-glass border border-white/10 rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">ID</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Applicant</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Interests</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500 hidden md:table-cell">Applied</th>
                <th className="px-4 py-3 text-xs font-sans font-semibold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => (
                <BetaApplicationRow
                  key={app._id}
                  application={app}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingId === app._id}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3 p-4">
          {applications.map((app) => (
            <div key={app._id}>
               <BetaApplicationRow
                application={app}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingId === app._id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-sans text-neutral-400 px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="liquid-glass border border-white/10 rounded-full px-4 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}