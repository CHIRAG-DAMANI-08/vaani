import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Session } from "@/lib/models/session";

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectToDatabase();

    // Fetch all sessions for this user
    const sessions = await Session.find({ clerkId: userId })
      .sort({ startedAt: -1 })
      .lean();

    // Format the response
    const exportData = sessions.map((s) => ({
      sessionId: s._id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationSeconds: Math.round((s.durationMs || 0) / 1000),
      chunksProcessed: s.chunksProcessed,
      costINR: s.estimatedCostINR,
      languages: s.activeLanguages,
      transcript: s.transcript,
    }));

    // Return as a JSON file download
    const response = new NextResponse(JSON.stringify(exportData, null, 2));
    response.headers.set("Content-Type", "application/json");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="vaani_sessions_export_${new Date().toISOString().split('T')[0]}.json"`
    );

    return response;
  } catch (error) {
    console.error("[SESSIONS_EXPORT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
