import { StatusRow } from "./StatusRow";
import { logger } from "@/lib/logger";
import { PipelineMonitor } from "./PipelineMonitor";
import { SessionStats } from "./SessionStats";
import { LiveTranscript } from "./LiveTranscript";
import { PastSessions } from "./PastSessions";
import { TestModePanel } from "@/app/components/TestModePanel";
import { Download } from "lucide-react";
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
      logger.error({ err }, "Dashboard data fetch failed");
    }
  }

  const hoursTranslated = Math.floor(cumulative.totalDurationMs / 3600000);
  const totalCost = cumulative.totalCostINR.toFixed(2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1.5">
            OVERVIEW
          </p>
          <h1 className="text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight leading-none">
            Dash<span className="font-serif italic font-normal">board</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="liquid-glass px-4 py-2 rounded-full border border-white/10 text-xs text-neutral-300 font-medium">
            <span className="text-neutral-500 uppercase tracking-wider text-[10px] font-semibold mr-2">TOTAL USAGE —</span>
            <span>{hoursTranslated}h translated · ₹{totalCost} spent</span>
          </div>
          <a 
            href="/api/sessions/export" 
            className="liquid-glass px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            download
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
            Export Data
          </a>
        </div>
      </div>

      {/* Channel status cards grid */}
      <StatusRow />

      {/* Pipeline Monitor */}
      <PipelineMonitor />

      {/* Pipeline Test mode panel */}
      <TestModePanel />

      {/* Transcript + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
