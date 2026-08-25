import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { validateCSRF } from "@/lib/csrf";
import { encryptValue } from "@/lib/encryption";
import crypto from "crypto";

const RTMP_URL_REGEX = /^rtmp(s)?:\/\/[^\s/$.?#][^\s]*$/;
const DEFAULT_SERVER_URL = "rtmp://localhost:1935/live";

/**
 * GET /api/stream-config
 * Returns the user's stream server URL and masked stream key.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }).lean();

    return NextResponse.json({
      serverUrl: user?.streamServerUrl || DEFAULT_SERVER_URL,
      streamKeyMasked: user?.streamKeyLast4 ? `••••${user.streamKeyLast4}` : null,
      hasStreamKey: !!user?.streamKeyEnc,
      updatedAt: user?.updatedAt || null,
    });
  } catch (error) {
    console.error(`[stream-config] GET failed for user ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/stream-config
 * Update server URL and/or rotate stream key.
 * Body: { serverUrl?: string, rotateKey?: boolean }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await validateCSRF(request, userId))) {
    return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
  }

  let body: { serverUrl?: string; rotateKey?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  // Validate and set server URL
  if (body.serverUrl !== undefined) {
    if (body.serverUrl !== null && body.serverUrl !== "") {
      if (body.serverUrl.length > 500 || !RTMP_URL_REGEX.test(body.serverUrl)) {
        return NextResponse.json(
          { error: "INVALID_URL", message: "Must be a valid rtmp:// or rtmps:// URL (max 500 chars)." },
          { status: 400 }
        );
      }
    }
    updateData.streamServerUrl = body.serverUrl || null;
  }

  // Rotate stream key
  if (body.rotateKey) {
    const newKey = crypto.randomBytes(16).toString("hex"); // 32-char hex
    updateData.streamKeyEnc = encryptValue(newKey);
    updateData.streamKeyLast4 = newKey.slice(-4);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      serverUrl: user?.streamServerUrl || DEFAULT_SERVER_URL,
      streamKeyMasked: user?.streamKeyLast4 ? `••••${user.streamKeyLast4}` : null,
      hasStreamKey: !!user?.streamKeyEnc,
      rotated: !!body.rotateKey,
    });
  } catch (error) {
    console.error(`[stream-config] POST failed for user ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
