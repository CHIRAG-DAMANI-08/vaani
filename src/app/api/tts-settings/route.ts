import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { validateCSRF } from "@/lib/csrf";

const VALID_SPEAKERS = new Set([
  "shubh", "anushka", "manisha", "vidya", "arjun", "arvind", "amol", "amartya",
]);

const VALID_LANGS = new Set([
  "auto", "en-IN", "hi-IN", "ta-IN", "te-IN", "mr-IN", "kn-IN", "bn-IN", "gu-IN", "ml-IN", "pa-IN",
]);

/**
 * GET /api/tts-settings
 * Returns the user's cloud-synced TTS settings.
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
      speaker: user?.ttsSpeaker || "shubh",
      pace: user?.ttsPace ?? 1.0,
      sourceLang: user?.ttsSourceLang || "auto",
    });
  } catch (error) {
    console.error(`[tts-settings] GET failed for user ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/tts-settings
 * Update TTS settings (speaker, pace, sourceLang).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await validateCSRF(request, userId))) {
    return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
  }

  let body: { speaker?: string; pace?: number; sourceLang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.speaker !== undefined) {
    if (!VALID_SPEAKERS.has(body.speaker)) {
      return NextResponse.json({ error: "INVALID_SPEAKER" }, { status: 400 });
    }
    updateData.ttsSpeaker = body.speaker;
  }

  if (body.pace !== undefined) {
    const pace = Math.min(2.0, Math.max(0.5, Number(body.pace)));
    if (isNaN(pace)) {
      return NextResponse.json({ error: "INVALID_PACE" }, { status: 400 });
    }
    updateData.ttsPace = pace;
  }

  if (body.sourceLang !== undefined) {
    if (!VALID_LANGS.has(body.sourceLang)) {
      return NextResponse.json({ error: "INVALID_LANG" }, { status: 400 });
    }
    updateData.ttsSourceLang = body.sourceLang;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({ success: true, ...updateData });
  } catch (error) {
    console.error(`[tts-settings] POST failed for user ${userId}:`, error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
