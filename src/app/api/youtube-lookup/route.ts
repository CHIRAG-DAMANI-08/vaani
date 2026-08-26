import { NextRequest, NextResponse } from "next/server";

function cleanYoutubeInput(input: string): { handle: string; fullUrl: string } {
  let clean = input.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      const pathname = parsed.pathname.replace(/\/+$/, "");
      const segments = pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1] || "";
      const handle = last.startsWith("@") ? last : `@${last}`;
      return { handle, fullUrl: clean };
    } catch {
      return { handle: clean, fullUrl: clean };
    }
  }

  const handle = clean.startsWith("@") ? clean : `@${clean}`;
  return {
    handle,
    fullUrl: `https://youtube.com/${handle}`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawInput = searchParams.get("channel") || searchParams.get("url");

  if (!rawInput) {
    return NextResponse.json({ error: "Missing channel handle or URL" }, { status: 400 });
  }

  const { handle, fullUrl } = cleanYoutubeInput(rawInput);
  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    // 1. If YouTube API Key is available, use official Data API v3
    if (apiKey) {
      const handleClean = handle.replace(/^@/, "");
      const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handleClean)}&key=${apiKey}`;
      const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (item) {
          const rawSubs = item.statistics?.subscriberCount;
          const numSubs = parseInt(rawSubs, 10);
          const subscriberCount = !isNaN(numSubs)
            ? numSubs >= 1_000_000
              ? `${(numSubs / 1_000_000).toFixed(1)}M subscribers`
              : numSubs >= 1_000
              ? `${(numSubs / 1_000).toFixed(1)}K subscribers`
              : `${numSubs} subscribers`
            : "Live Streamer";

          return NextResponse.json({
            ok: true,
            channel: {
              handle,
              title: item.snippet?.title || handle,
              url: `https://youtube.com/${handle}`,
              subscriberCount,
              avatar: item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || null,
              rawSubscribers: numSubs || null,
            },
          });
        }
      }
    }

    // 2. Fallback: Query YouTube public channel page / oEmbed for public metadata
    const pageRes = await fetch(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      
      // Extract title from og:title
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i);
      const title = titleMatch ? titleMatch[1] : handle;

      // Extract avatar from og:image
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)">/i);
      const avatar = imageMatch ? imageMatch[1] : null;

      // Try extracting subscriber count from YouTube page metadata JSON
      let subscriberCount = "Active Creator";
      const subMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"\}\},"simpleText":"([^"]+)"\}/);
      if (subMatch && (subMatch[2] || subMatch[1])) {
        subscriberCount = subMatch[2] || subMatch[1];
      } else {
        const regexSimple = html.match(/([\d\.]+[KMBkmb]?\s+subscribers)/i);
        if (regexSimple) {
          subscriberCount = regexSimple[1];
        }
      }

      return NextResponse.json({
        ok: true,
        channel: {
          handle,
          title,
          url: fullUrl,
          subscriberCount,
          avatar,
        },
      });
    }

    // If fetch failed, return clean formatted fallback
    return NextResponse.json({
      ok: true,
      channel: {
        handle,
        title: handle,
        url: fullUrl,
        subscriberCount: "Verified Creator",
        avatar: null,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      channel: {
        handle,
        title: handle,
        url: fullUrl,
        subscriberCount: "YouTube Streamer",
        avatar: null,
      },
    });
  }
}
