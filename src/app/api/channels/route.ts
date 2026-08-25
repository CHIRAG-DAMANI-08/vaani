import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Channel, SUPPORTED_LANGUAGES } from "@/lib/models/channel";
import { validateCSRF } from "@/lib/csrf";

const RTMP_URL_REGEX = /^rtmp(s)?:\/\/[^\s/$.?#][^\s]*$/;
const RTMP_KEY_REGEX = /^[a-zA-Z0-9_-]{8,200}$/;

/**
 * GET /api/channels
 * Returns all channels for the authenticated user.
 * If the user has no channels yet, returns the default (unconfigured) list.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const userChannels = await Channel.find({ clerkId: userId }).lean();

    // Merge saved channels with supported languages
    const channels = SUPPORTED_LANGUAGES.map((lang) => {
      const saved = userChannels.find(
        (ch: Record<string, unknown>) => ch.languageId === lang.id
      );
      return {
        id: lang.id,
        name: lang.name,
        script: lang.script,
        color: lang.color,
        enabled: saved?.enabled || false,
        rtmpUrl: saved?.rtmpUrl || null,
        hasRtmpKey: !!(saved?.rtmpKeyEnc),
        updatedAt: saved?.updatedAt || null,
      };
    });

    return NextResponse.json({ channels }, { status: 200 });
  } catch (error) {
    console.error(`[channels] GET failed for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/channels
 * Create or update a channel for the authenticated user.
 * Body: { languageId, rtmpKey?, rtmpUrl?, enabled? }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // CSRF validation
  if (!(await validateCSRF(request, userId))) {
    return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
  }

  let body: { languageId?: string; rtmpKey?: string; rtmpUrl?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { languageId, rtmpKey, rtmpUrl, enabled } = body;

  // Validate languageId
  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === languageId);
  if (!lang) {
    return NextResponse.json(
      { error: "INVALID_LANGUAGE", message: "Unsupported language." },
      { status: 400 }
    );
  }

  // Validate rtmpUrl format
  if (rtmpUrl !== undefined && rtmpUrl !== null && rtmpUrl !== "") {
    if (rtmpUrl.length > 500 || !RTMP_URL_REGEX.test(rtmpUrl)) {
      return NextResponse.json(
        { error: "INVALID_RTMP_URL", message: "RTMP URL must be a valid rtmp:// or rtmps:// URL (max 500 chars)." },
        { status: 400 }
      );
    }
  }

  // Validate rtmpKey format
  if (rtmpKey !== undefined && rtmpKey !== null && rtmpKey !== "") {
    if (!RTMP_KEY_REGEX.test(rtmpKey)) {
      return NextResponse.json(
        { error: "INVALID_RTMP_KEY", message: "RTMP key must be 8-200 characters: letters, numbers, hyphens, underscores." },
        { status: 400 }
      );
    }
  }

  try {
    await connectToDatabase();

    const updateData: Record<string, unknown> = {
      clerkId: userId,
      languageId: lang.id,
      languageName: lang.name,
      script: lang.script,
    };

    // rtmpKey is a virtual that auto-encrypts via the model hook
    if (rtmpKey !== undefined) updateData.rtmpKey = rtmpKey || null;
    if (rtmpUrl !== undefined) updateData.rtmpUrl = rtmpUrl || null;
    if (enabled !== undefined) updateData.enabled = enabled;

    const channel = await Channel.findOneAndUpdate(
      { clerkId: userId, languageId: lang.id },
      updateData,
      { upsert: true, new: true }
    );

    console.log(`[channels] Upserted ${lang.id} for user ${userId}`);

    return NextResponse.json(
      {
        success: true,
        channel: {
          id: channel.languageId,
          name: channel.languageName,
          script: channel.script,
          enabled: channel.enabled,
          hasRtmpKey: !!channel.rtmpKeyEnc,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[channels] POST failed for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/channels
 * Remove a channel for the authenticated user.
 * Body: { languageId }
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // CSRF validation
  if (!(await validateCSRF(request, userId))) {
    return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
  }

  let body: { languageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body.languageId) {
    return NextResponse.json(
      { error: "MISSING_LANGUAGE", message: "languageId is required." },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    await Channel.findOneAndDelete({
      clerkId: userId,
      languageId: body.languageId,
    });

    console.log(`[channels] Deleted ${body.languageId} for user ${userId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`[channels] DELETE failed for user ${userId}:`, error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}
