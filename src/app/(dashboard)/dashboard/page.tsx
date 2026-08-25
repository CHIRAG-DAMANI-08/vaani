import { StatusRow } from "./StatusRow";
import { PipelineMonitor } from "./PipelineMonitor";
import { SessionStats } from "./SessionStats";
import { LiveTranscript } from "./LiveTranscript";
import { PastSessions } from "./PastSessions";
import { TestModePanel } from "@/app/components/TestModePanel";
import { Download, Activity } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Session } from "@/lib/models/session";

export default async function DashboardPage() {
  const { userId } = await auth();
  let cumulative = { totalDurationMs: 0, totalCostINR: 0, totalChunks: 0 };
  let pastSessions: any[] = [];

  if (userId) {
    try {
      await connectToDatabase();

      const stats = await Session.aggregate([
        { $match: { clerkId: userId } },
        {
          $group: {
            _id: null,
            totalDurationMs: { $sum: "$durationMs" },
            totalCostINR: { $sum: "$estimatedCostINR" },
            totalChunks: { $sum: "$chunksProcessed" },
          },
        },
      ]);
      if (stats[0]) cumulative = stats[0];

      pastSessions = await Session.find({ clerkId: userId })
        .sort({ startedAt: -1 })
        .limit(5)
        .lean();
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }

  const hoursTranslated = Math.floor(cumulative.totalDurationMs / 3600000);
  const totalCost = cumulative.totalCostINR.toFixed(2);
  return (
    <div className="space-y-[32px] pt-2">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
           <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--accent))] mb-2 drop-shadow-sm">
             Overview
           </p>
           <h1 className="text-[36px] font-bold text-white tracking-tight leading-none" style={{ fontFamily: "var(--font-serif)" }}>
             Dashboard
           </h1>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="liquid-glass px-5 py-2.5 rounded-[16px] flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 mb-0.5">Total Usage</span>
            <span className="text-[14px] font-bold text-white">
              <span className="text-[hsl(var(--stage-stt))]">{hoursTranslated}h</span> translated <span className="text-white/30 mx-1">•</span> <span className="text-[hsl(var(--accent))]">₹{totalCost}</span> spent
            </span>
          </div>
          <a
            href="/api/sessions/export"
            className="px-5 py-[14px] rounded-[16px] bg-[hsl(var(--accent))] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] border border-white/20 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            download
          >
             <Download className="w-4 h-4" />
             Export Data
          </a>
        </div>
      </div>

      {/* Channel status cards */}
      <StatusRow />

      {/* Pipeline Monitor */}
      <PipelineMonitor />

      {/* Test Mode */}
      <TestModePanel />

      {/* Transcript + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[24px]">
        <div className="lg:col-span-3 min-h-[300px]">
          <LiveTranscript />
        </div>
        <div className="lg:col-span-2 min-h-[300px]">
          <SessionStats />
        </div>
      </div>

      {/* Past Sessions */}
      <PastSessions sessions={JSON.parse(JSON.stringify(pastSessions))} />
    </div>
  );
}