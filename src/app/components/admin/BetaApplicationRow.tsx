"use client";

import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BetaApplicationRowProps {
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
}

const STATUS_STYLES = {
  pending: "border border-amber-500/40 text-amber-400 bg-transparent",
  approved: "border border-[#2DD4BF]/40 text-[#2DD4BF] bg-transparent",
  rejected: "border border-red-500/40 text-red-400 bg-transparent",
  review: "border border-blue-500/40 text-blue-400 bg-transparent",
};

const LANGUAGE_LABELS: Record<string, { flag: string; name: string }> = {
  hi: { flag: "��������", name: "Hindi" },
  ta: { flag: "��������", name: "Tamil" },
  te: { flag: "��������", name: "Telugu" },
  kn: { flag: "��������", name: "Kannada" },
  mr: { flag: "��������", name: "Marathi" },
  bn: { flag: "��������", name: "Bengali" },
  gu: { flag: "��������", name: "Gujarati" },
  ml: { flag: "��������", name: "Malayalam" },
};

export function BetaApplicationRow({ application, onApprove, onReject, isProcessing }: BetaApplicationRowProps) {
  const statusStyle = STATUS_STYLES[application.status];
  const interests = application.interests.map((id) => LANGUAGE_LABELS[id]?.name || id).join(", ");

  const handleApprove = () => !isProcessing && onApprove(application._id);
  const handleReject = () => !isProcessing && onReject(application._id);

  // Desktop table row
  const desktopRow = (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-mono text-xs text-neutral-400">{application._id.slice(-6)}</td>
      <td className="px-4 py-3">
        <div className="font-sans text-sm text-white">{application.name || "—"}</div>
        <div className="font-mono text-xs text-neutral-400 truncate max-w-xs">{application.email}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-neutral-300 max-w-xs truncate">{interests || "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
          {application.status.toUpperCase()}
        </span>
        {application.reviewReason && (
          <span className="ml-2 text-[10px] text-neutral-500 font-sans">({application.reviewReason})</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-neutral-500 hidden md:table-cell">
        {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {application.status === "pending" || application.status === "review" ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                <Check size={12} strokeWidth={2} />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Reject
              </button>
            </>
          ) : application.status === "approved" ? (
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <X size={12} strokeWidth={2} />
              Revoke
            </button>
          ) : (
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
            >
              <Check size={12} strokeWidth={2} />
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  // Mobile card
  const mobileCard = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="liquid-glass border border-white/10 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-sans text-sm font-medium text-white">{application.name || "Unnamed"}</div>
          <div className="font-mono text-xs text-neutral-400">{application.email}</div>
        </div>
        <span className={`text-xs font-sans font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
          {application.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="font-sans font-medium">Interests:</span>
          <span className="font-mono">{interests || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="font-sans font-medium">Applied:</span>
          <span className="font-mono">{formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}</span>
        </div>
        {application.deviceHash && (
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="font-sans font-medium">Device:</span>
            <span className="font-mono">{application.deviceHash.slice(0, 12)}...</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="font-sans font-medium">IP:</span>
          <span className="font-mono">{application.ipAddress}</span>
        </div>
        {application.reviewReason && (
          <div className="flex items-center gap-2 text-blue-400">
            <AlertTriangle size={12} />
            <span className="font-sans">Review: {application.reviewReason}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {application.status === "pending" || application.status === "review" ? (
          <>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Check size={12} strokeWidth={2} />
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <X size={12} strokeWidth={2} />
              Reject
            </button>
          </>
        ) : application.status === "approved" ? (
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <X size={12} strokeWidth={2} />
            Revoke
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Check size={12} strokeWidth={2} />
            Restore
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  );
}