import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Rate limiting (60 per minute per PRD)
  const rateLimitResult = rateLimit(`${userId}:obs-status`, { 
    maxRequests: 60, 
    windowMs: 60 * 1000 
  });
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", retryAfterSeconds: Math.ceil(rateLimitResult.remainingMs / 1000) },
      { status: 429, headers: { "Retry-After": Math.ceil(rateLimitResult.remainingMs / 1000).toString() } }
    );
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }).lean();

    if (!user || user.obsHost === null) {
      return NextResponse.json({ configured: false, connected: false });
    }

    // Access global tracking state set by the custom WS server
    const globalAny = global as any;
    const activeStatusMap = globalAny.activeObsStatus as Map<string, { obsConnected: boolean; lastSeen: number }> | undefined;
    
    let connected = false;
    if (activeStatusMap?.has(userId)) {
        connected = activeStatusMap.get(userId)!.obsConnected;
    }

    return NextResponse.json({
      configured: true,
      connected,
      host: user.obsHost,
      port: user.obsPort,
      hasPassword: user.obsPasswordEnc !== null,
      updatedAt: user.obsCredentialsUpdatedAt,
    });
  } catch (error) {
    console.error(`[obs/status] Failed to fetch for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}
