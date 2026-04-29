import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
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
    console.error("[Health Check] Failed:", error);
    return NextResponse.json({ 
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    }, { status: 503 });
  }
}
