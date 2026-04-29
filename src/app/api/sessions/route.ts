import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Session } from "@/lib/models/session";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectToDatabase();

    // Fetch past sessions, newest first, limit to 20 for dashboard
    const sessions = await Session.find({ clerkId: userId })
      .sort({ startedAt: -1 })
      .limit(20)
      .lean();

    // Calculate cumulative stats
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

    const cumulative = stats[0] || {
      totalDurationMs: 0,
      totalCostINR: 0,
      totalChunks: 0,
    };

    return NextResponse.json({
      sessions,
      cumulative,
    });
  } catch (error) {
    console.error("[SESSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
