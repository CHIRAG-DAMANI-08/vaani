"use client";

import { motion } from "framer-motion";
import { Check, X, Warning, CircleNotch } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

export interface BetaApplicationRowProps {
  application: {
    _id: string;
    email: string;
    name?: string;
    interests: string[];
    status: "pending" | "approved" | "rejected" | "review";
    reviewReason?: string;
    deviceHash?: string;
    ipAddress: string;
    createdAt: string;
    reviewedAt?: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: boolean;
  variant?: "table" | "card";
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border border-amber-500/40 text-amber-300 bg-amber-500/10",
  approved: "border border-[#2DD4BF]/40 text-[#2DD4BF] bg-[#2DD4BF]/10",
  rejected: "border border-red-500/40 text-red-400 bg-red-500/10",
  review: "border border-blue-500/40 text-blue-400 bg-blue-500/10",
};

const LANGUAGE_LABELS: Record<string, { flag: string; name: string }> = {
  hi: { flag: "🇮🇳", name: "Hindi" },
  ta: { flag: "🇮🇳", name: "Tamil" },
  te: { flag: "🇮🇳", name: "Telugu" },
  kn: { flag: "🇮🇳", name: "Kannada" },
  mr: { flag: "🇮🇳", name: "Marathi" },
  bn: { flag: "🇮🇳", name: "Bengali" },
  gu: { flag: "🇮🇳", name: "Gujarati" },
  ml: { flag: "🇮🇳", name: "Malayalam" },
};

export function BetaApplicationRow({
  application,
  onApprove,
  onReject,
  isProcessing = false,
  variant = "table",
}: BetaApplicationRowProps) {
  const statusStyle = STATUS_STYLES[application.status] || STATUS_STYLES.pending;
  const interests = (application.interests || [])
    .map((id) => LANGUAGE_LABELS[id]?.name || id)
    .join(", ");

  const handleApprove = () => !isProcessing && onApprove(application._id);
  const handleReject = () => !isProcessing && onReject(application._id);

  if (variant === "card") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="liquid-glass border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-sans text-base font-bold text-white">
              {application.name || "Unnamed Applicant"}
            </div>
            <div className="font-mono text-xs text-neutral-300 select-all mt-0.5">
              {application.email}
            </div>
          </div>
          <span className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusStyle}`}>
            {application.status}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {interests && (
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="font-sans text-neutral-500">Languages:</span>
              <span className="font-medium">{interests}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="font-sans text-neutral-500">Applied:</span>
            <span className="font-mono">
              {application.createdAt
                ? formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })
                : "recently"}
            </span>
          </div>
          {application.ipAddress && application.ipAddress !== "unknown" && (
            <div className="flex items-center gap-2 text-neutral-500 font-mono">
              <span>IP: {application.ipAddress}</span>
            </div>
          )}
          {application.reviewReason && (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs">
              <Warning size={13} />
              <span>Flag: {application.reviewReason}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-white/10">
          {application.status === "pending" || application.status === "review" ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isProcessing ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isProcessing ? <CircleNotch size={13} className="animate-spin" /> : <X size={13} strokeWidth={2.5} />}
                Reject
              </button>
            </>
          ) : application.status === "approved" ? (
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="w-full px-4 py-2 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isProcessing ? <CircleNotch size={13} className="animate-spin" /> : <X size={13} strokeWidth={2.5} />}
              Revoke Access
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="w-full px-4 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isProcessing ? <CircleNotch size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
              Restore Access
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Desktop Table Row
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
      <td className="px-5 py-4 font-mono text-xs text-neutral-500">
        {application._id ? application._id.slice(-6) : "—"}
      </td>
      <td className="px-5 py-4">
        <div className="font-sans text-sm font-semibold text-white">
          {application.name || "—"}
        </div>
        <div className="font-mono text-xs text-neutral-400 select-all truncate max-w-[260px]">
          {application.email}
        </div>
      </td>
      <td className="px-5 py-4 font-sans text-xs text-neutral-300 max-w-[200px] truncate">
        {interests || "—"}
      </td>
      <td className="px-5 py-4">
        <span className={`text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 ${statusStyle}`}>
          {application.status}
        </span>
        {application.reviewReason && (
          <span className="block mt-1 text-[10px] text-amber-400 font-sans">
            ⚠ {application.reviewReason}
          </span>
        )}
      </td>
      <td className="px-5 py-4 font-mono text-xs text-neutral-400 whitespace-nowrap">
        {application.createdAt
          ? formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })
          : "recently"}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {application.status === "pending" || application.status === "review" ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                title="Approve and send sign-up invitation email"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                title="Reject application and notify applicant"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <X size={12} strokeWidth={2.5} />}
                Reject
              </button>
            </>
          ) : application.status === "approved" ? (
            <button
              onClick={handleReject}
              disabled={isProcessing}
              title="Revoke access immediately"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <X size={12} strokeWidth={2.5} />}
              Revoke
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              title="Restore and approve application"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isProcessing ? <CircleNotch size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}