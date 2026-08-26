"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  CircleNotch,
  Television,
  Users,
  Translate,
  ArrowSquareOut,
  Key,
  VideoCamera,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { format } from "date-fns";

export interface BetaApplicationItem {
  _id: string;
  email: string;
  name?: string;
  interests?: string[];
  youtubeChannel?: string;
  channelTitle?: string;
  subscriberCount?: string;
  channelAvatar?: string;
  obsSetup?: "using_obs" | "needs_guide";
  sarvamPreference?: "need_key" | "bring_own";
  reason?: string;
  streamFrequency?: string;
  status: "pending" | "approved" | "rejected" | "review";
  createdAt: string;
}

interface BetaApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: BetaApplicationItem[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  processingId: string | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  mr: "Marathi",
  bn: "Bengali",
  gu: "Gujarati",
  ml: "Malayalam",
};

export function BetaApplicantsModal({
  isOpen,
  onClose,
  applications,
  onApprove,
  onReject,
  processingId,
}: BetaApplicantsModalProps) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    const applied = applications.filter((a) => a.status === "pending" || a.status === "review").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return {
      applied,
      approved,
      rejected,
      all: applications.length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (filter === "all") return applications;
    if (filter === "pending") {
      return applications.filter((a) => a.status === "pending" || a.status === "review");
    }
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatLanguages = (interests?: string[]) => {
    if (!interests || interests.length === 0) return "Hindi → Tamil, Telugu";
    const mapped = interests.map((code) => LANGUAGE_LABELS[code] || code);
    if (mapped.length === 1) return mapped[0];
    return `Hindi → ${mapped.join(", ")}`;
  };

  const getApplicationShortId = (id: string) => {
    return `ba_${id.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-[#09090b] border border-white/15 rounded-3xl overflow-hidden text-white shadow-2xl my-6 max-h-[92vh] flex flex-col z-10"
        >
          {/* Top Bar Header */}
          <div className="p-6 sm:p-8 pb-4 border-b border-white/10 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">
              Beta applicants
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Review signup details and approve access to the Vaani beta.
            </p>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <button
                onClick={() => setFilter("pending")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                  filter === "pending"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "bg-white/[0.04] text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                Applied · {counts.applied}
              </button>

              <button
                onClick={() => setFilter("approved")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                  filter === "approved"
                    ? "bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40 shadow-sm"
                    : "bg-white/[0.04] text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                Approved · {counts.approved}
              </button>

              <button
                onClick={() => setFilter("rejected")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                  filter === "rejected"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm"
                    : "bg-white/[0.04] text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                Rejected · {counts.rejected}
              </button>

              <button
                onClick={() => setFilter("all")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-white text-black border border-white font-bold"
                    : "bg-white/[0.04] text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                All · {counts.all}
              </button>
            </div>
          </div>

          {/* Applicants List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 text-sm">
                No applicants found for this filter.
              </div>
            ) : (
              filteredApplications.map((app) => {
                const isExpanded = !!expandedIds[app._id];
                const isProcessing = processingId === app._id;
                const initial = (app.name || app.email || "V").charAt(0).toUpperCase();
                const appliedDate = app.createdAt
                  ? format(new Date(app.createdAt), "d MMM yyyy")
                  : "Recent";

                const isApplied = app.status === "pending" || app.status === "review";
                const isApproved = app.status === "approved";
                const isRejected = app.status === "rejected";

                return (
                  <motion.div
                    key={app._id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all overflow-hidden shadow-lg"
                  >
                    {/* Main Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-lg flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-base">
                              {app.name || app.email.split("@")[0]}
                            </span>
                            {isApplied && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                ● Applied
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30">
                                ● Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                                ● Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-400 font-mono text-xs mt-0.5">{app.email}</p>
                        </div>
                      </div>

                      {/* Right: Date, ID, and Details Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right text-[11px] text-neutral-400">
                          <p>Applied {appliedDate}</p>
                          <p className="font-mono text-neutral-500">{getApplicationShortId(app._id)}</p>
                        </div>

                        <button
                          onClick={() => toggleExpand(app._id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                            isExpanded
                              ? "bg-white text-black border-white"
                              : "bg-white/[0.05] text-neutral-300 border-white/15 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          Details
                          {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Drawer (Matches Image 3) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="px-4 sm:px-6 pb-5 pt-2 border-t border-white/10 bg-black/40 space-y-4"
                        >
                          {/* 6-Grid Stats Box */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-xs">
                            {/* Platform */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <Television size={14} />
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  Platform
                                </p>
                                <p className="text-white font-medium mt-0.5">
                                  YouTube · {app.streamFrequency || "5 streams/wk"}
                                </p>
                              </div>
                            </div>

                            {/* Audience */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <Users size={14} />
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  Audience
                                </p>
                                <p className="text-white font-medium mt-0.5">
                                  {app.subscriberCount || "84,200 followers · 1,900 avg"}
                                </p>
                              </div>
                            </div>

                            {/* Languages */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <Translate size={14} />
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  Languages
                                </p>
                                <p className="text-white font-medium mt-0.5">
                                  {formatLanguages(app.interests)}
                                </p>
                              </div>
                            </div>

                            {/* Channel Link */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <ArrowSquareOut size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  Channel
                                </p>
                                <a
                                  href={
                                    app.youtubeChannel?.startsWith("http")
                                      ? app.youtubeChannel
                                      : `https://youtube.com/${app.youtubeChannel || "@creator"}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-neutral-200 hover:text-white font-mono underline underline-offset-2 truncate block mt-0.5"
                                >
                                  {app.youtubeChannel || "youtube.com/@aaravplays"}
                                </a>
                              </div>
                            </div>

                            {/* Sarvam Key */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <Key size={14} />
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  Sarvam Key
                                </p>
                                <p className="text-white font-medium mt-0.5">
                                  {app.sarvamPreference === "bring_own"
                                    ? "Bring own key"
                                    : "Provided by Vaani"}
                                </p>
                              </div>
                            </div>

                            {/* OBS Setup */}
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 rounded-lg bg-white/5 text-neutral-400 shrink-0">
                                <VideoCamera size={14} />
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider">
                                  OBS Setup
                                </p>
                                <p className="text-white font-medium mt-0.5">
                                  {app.obsSetup === "needs_guide"
                                    ? "Needs OBS Setup Guide"
                                    : "Already using OBS"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Why They Want In */}
                          <div className="pt-2">
                            <p className="font-semibold text-neutral-400 uppercase text-[10px] tracking-wider mb-1.5">
                              Why They Want In
                            </p>
                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-neutral-200 text-xs sm:text-sm leading-relaxed">
                              {app.reason ||
                                "I stream Valorant in Hindi but half my chat is from Chennai and Hyderabad. Live translated audio channels would let me keep one stream instead of three."}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bottom Action Footer */}
                    <div className="px-4 sm:px-6 py-3 border-t border-white/10 flex items-center justify-end gap-2 bg-white/[0.01]">
                      {isApplied && (
                        <>
                          <button
                            onClick={() => onReject(app._id)}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <X size={12} />}
                            ✕ Reject
                          </button>
                          <button
                            onClick={() => onApprove(app._id)}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/25 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <Check size={12} />}
                            ✓ Approve
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => onReject(app._id)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <X size={12} />}
                          Revoke Access
                        </button>
                      )}

                      {isRejected && (
                        <button
                          onClick={() => onApprove(app._id)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <Check size={12} />}
                          Restore & Approve
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
