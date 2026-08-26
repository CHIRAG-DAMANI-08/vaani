"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Broadcast,
  Users,
  Clock,
  CurrencyInr,
  ArrowUpRight,
  UserCheck,
  UserMinus,
  Hourglass,
  ArrowsClockwise,
  Pulse,
  Waveform,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { BetaApplicantsModal, BetaApplicationItem } from "./BetaApplicantsModal";

interface AdminDashboardOverviewProps {
  initialApplications?: BetaApplicationItem[];
}

export function AdminDashboardOverview({
  initialApplications = [],
}: AdminDashboardOverviewProps) {
  const [applications, setApplications] = useState<BetaApplicationItem[]>(initialApplications);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApplications = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/beta-applications?limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data.applications) {
          setApplications(data.applications);
        }
      }
    } catch {
      toast.error("Failed to refresh applications");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const appliedCount = applications.length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;
  const awaitingCount = applications.filter((a) => a.status === "pending" || a.status === "review").length;

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/admin/beta-applications/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }

      setApplications((prev) =>
        prev.map((app) => (app._id === id ? { ...app, status: "approved" as const } : app))
      );
      toast.success("Application approved & invitation email sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/admin/beta-applications/${id}/reject`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      setApplications((prev) =>
        prev.map((app) => (app._id === id ? { ...app, status: "rejected" as const } : app))
      );
      toast.success("Application updated & status email sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to update application");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 sm:p-8">
      {/* Header (Matches Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-neutral-400 font-semibold mb-1">
            Vaani · Internal
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
            Admin <span className="text-[#2DD4BF]">console</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Platform health and beta access control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApplications}
            disabled={isRefreshing}
            className="p-2.5 rounded-full liquid-glass border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Refresh statistics"
          >
            <ArrowsClockwise size={16} className={isRefreshing ? "animate-spin text-[#2DD4BF]" : ""} />
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full liquid-glass border border-white/15 bg-white/[0.03] shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-sans">
              Pipeline Healthy
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: 4 Key Metric Cards (Matches Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: LIVE SESSIONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="liquid-glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Broadcast size={20} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          </div>
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-neutral-400">
            Live Sessions
          </p>
          <p className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight mt-1">
            12
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            Across 4 language channels
          </p>
        </motion.div>

        {/* Card 2: ACTIVE STREAMERS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="liquid-glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              7d Active
            </span>
          </div>
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-neutral-400">
            Active Streamers
          </p>
          <p className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight mt-1">
            148
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            Streamed in last 7 days
          </p>
        </motion.div>

        {/* Card 3: AVG LATENCY */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="liquid-glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
              STT → TTS
            </span>
          </div>
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-neutral-400">
            Avg Latency
          </p>
          <p className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight mt-1">
            2.4s
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            STT → TTS round trip
          </p>
        </motion.div>

        {/* Card 4: SARVAM SPEND */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="liquid-glass border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <CurrencyInr size={20} />
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              MTD
            </span>
          </div>
          <p className="text-xs font-sans font-semibold uppercase tracking-wider text-neutral-400">
            Sarvam Spend
          </p>
          <p className="text-3xl sm:text-4xl font-sans font-bold text-white tracking-tight mt-1">
            ₹18,420
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            Month to date
          </p>
        </motion.div>
      </div>

      {/* Row 2: Beta Access & Chunks Processed (Matches Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: USER BETA APPROVAL (Span 2 Cols) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-2 liquid-glass border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative group"
        >
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                  Beta Access
                </p>
                <h2 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight mt-1">
                  User beta approval
                </h2>
                <p className="text-sm text-neutral-400 mt-1">
                  {awaitingCount} {awaitingCount === 1 ? "streamer" : "streamers"} waiting on a decision
                </p>
              </div>

              {/* Review ↗ Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shadow-md shrink-0"
              >
                Review
                <ArrowUpRight size={14} />
              </button>
            </div>

            {/* 4 Inner Stat Blocks (Matches Image 1) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              {/* APPLIED */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group/stat"
              >
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                  <Users size={13} />
                  <span>Applied</span>
                </div>
                <p className="text-2xl sm:text-3xl font-sans font-bold text-blue-400 mt-2 group-hover/stat:scale-105 transition-transform">
                  {appliedCount}
                </p>
              </div>

              {/* APPROVED */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group/stat"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <UserCheck size={13} />
                  <span>Approved</span>
                </div>
                <p className="text-2xl sm:text-3xl font-sans font-bold text-emerald-400 mt-2 group-hover/stat:scale-105 transition-transform">
                  {approvedCount}
                </p>
              </div>

              {/* REJECTED */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-red-500/30 transition-all cursor-pointer group/stat"
              >
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold uppercase tracking-wider">
                  <UserMinus size={13} />
                  <span>Rejected</span>
                </div>
                <p className="text-2xl sm:text-3xl font-sans font-bold text-red-400 mt-2 group-hover/stat:scale-105 transition-transform">
                  {rejectedCount}
                </p>
              </div>

              {/* AWAITING */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all cursor-pointer group/stat"
              >
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                  <Hourglass size={13} />
                  <span>Awaiting</span>
                </div>
                <p className="text-2xl sm:text-3xl font-sans font-bold text-amber-400 mt-2 group-hover/stat:scale-105 transition-transform">
                  {awaitingCount}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Card: CHUNKS PROCESSED (Span 1 Col) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="liquid-glass border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-6">
              <Pulse size={24} />
            </div>

            <p className="text-xs font-sans font-semibold uppercase tracking-wider text-neutral-400">
              Chunks Processed
            </p>
            <p className="text-4xl sm:text-5xl font-sans font-bold text-white tracking-tight mt-2">
              1.29M
            </p>
          </div>

          <p className="text-xs text-neutral-400 mt-6 font-sans">
            Since launch of the beta
          </p>
        </motion.div>
      </div>

      {/* Beta Applicants Modal (Triggered by Review ↗ or Stat Clicks) */}
      <BetaApplicantsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        applications={applications}
        onApprove={handleApprove}
        onReject={handleReject}
        processingId={processingId}
      />
    </div>
  );
}
