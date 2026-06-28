import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit: 60 per minute per IP
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`health:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.remainingMs / 1000)) } });
  }

  try {
    // Check Database Connection
    await connectToDatabase();
    
    return NextResponse.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        web: "running"
      }
    }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return NextResponse.json({ 
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    }, { status: 503 });
  }
}
