import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Channel, SUPPORTED_LANGUAGES } from "@/lib/models/channel";
import { validateCSRF } from "@/lib/csrf";
import { encryptKey, decryptKey } from "@/lib/encryption";

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
        configured: !!(saved?.rtmpKey),
        rtmpUrl: saved?.rtmpUrl || null,
        hasRtmpKey: !!(saved?.rtmpKey),
        updatedAt: saved?.updatedAt || null,
      };
    });

    return NextResponse.json({ channels }, { status: 200 });
  } catch (error) {
    logger.error({ err: error, userId }, "Channels GET failed");
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

  // CSRF check
  if (!(await validateCSRF(request))) {
    return NextResponse.json({ error: "CSRF_FAILED" }, { status: 403 });
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

  try {
    await connectToDatabase();

    const updateData: Record<string, unknown> = {
      clerkId: userId,
      languageId: lang.id,
      languageName: lang.name,
      script: lang.script,
    };

    if (rtmpKey !== undefined) updateData.rtmpKey = rtmpKey ? encryptKey(rtmpKey) : null;
    if (rtmpUrl !== undefined) {
      // Validate RTMP URL protocol
      if (rtmpUrl) {
        try {
          const parsed = new URL(rtmpUrl);
          if (parsed.protocol !== "rtmp:" && parsed.protocol !== "rtmps:") {
            return NextResponse.json(
              { error: "INVALID_URL", message: "rtmpUrl must use rtmp:// or rtmps://" },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "INVALID_URL", message: "rtmpUrl is not a valid URL" },
            { status: 400 }
          );
        }
      }
      updateData.rtmpUrl = rtmpUrl || null;
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const channel = await Channel.findOneAndUpdate(
      { clerkId: userId, languageId: lang.id },
      updateData,
      { upsert: true, new: true }
    );

    logger.info({ userId, languageId: lang.id }, "Channel upserted");

    return NextResponse.json(
      {
        success: true,
        channel: {
          id: channel.languageId,
          name: channel.languageName,
          script: channel.script,
          enabled: channel.enabled,
          configured: !!channel.rtmpKey,
          hasRtmpKey: !!channel.rtmpKey,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error, userId }, "Channels POST failed");
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

  // CSRF check
  if (!(await validateCSRF(request))) {
    return NextResponse.json({ error: "CSRF_FAILED" }, { status: 403 });
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

    logger.info({ userId, languageId: body.languageId }, "Channel deleted");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ err: error, userId }, "Channels DELETE failed");
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}
