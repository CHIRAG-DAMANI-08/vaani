import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Session } from "@/lib/models/session";
import { validateCSRF } from "@/lib/csrf";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!(await validateCSRF(req))) {
      return NextResponse.json({ error: "CSRF_FAILED" }, { status: 403 });
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
    logger.error({ err: error }, "Sessions fetch failed");
    return new NextResponse("Internal Error", { status: 500 });
  }
}
