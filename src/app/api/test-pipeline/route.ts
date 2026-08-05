import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
// Updated module imports
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/lib/models/user";
import { translateText, textToSpeech } from "@/lib/sarvam-pipeline";
import { LANGUAGE_REGISTRY, LANG_MAP } from "@/lib/language-registry";
import { decryptKey } from "@/lib/encryption";
import { validateCSRF } from "@/lib/csrf";

/**
 * POST /api/test-pipeline
 *
 * Translates text and generates TTS audio for each target language.
 * Does NOT require OBS or a live stream — pure pipeline test.
 *
 * Body: { text, targetLanguages, speaker?, pace? }
 * Response: { results: [{ languageId, translatedText, audioBase64, speaker }], timings }
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await validateCSRF(req))) {
    return NextResponse.json({ error: "CSRF_FAILED" }, { status: 403 });
  }

  let body: {
    text?: string;
    targetLanguages?: string[];
    speaker?: string;
    pace?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { text, targetLanguages, speaker = "shubh", pace = 1.0 } = body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "TEXT_TOO_LONG" }, { status: 400 });
  }
  if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
    return NextResponse.json({ error: "LANGUAGES_REQUIRED" }, { status: 400 });
  }

  const clampedPace = Math.min(2.0, Math.max(0.5, pace));

  // Validate language IDs
  const validLangs = targetLanguages.filter((l) => LANG_MAP[l]);
  if (validLangs.length === 0) {
    return NextResponse.json({ error: "NO_VALID_LANGUAGES" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }, { sarvamKeyEnc: 1 }).lean();
    if (!user?.sarvamKeyEnc) {
      return NextResponse.json({ error: "NO_API_KEY" }, { status: 403 });
    }
    const apiKey = decryptKey(user.sarvamKeyEnc);
    if (!apiKey) {
      return NextResponse.json({ error: "KEY_DECRYPT_FAILED" }, { status: 500 });
    }

    const totalStart = Date.now();
    const translateStart = Date.now();

    // Translate text for all languages in parallel (source always en-IN in test mode)
    const translateResults = await Promise.allSettled(
      validLangs.map(async (langId) => {
        const targetCode = LANG_MAP[langId];
        const translated = await translateText(text.trim(), "en-IN", targetCode, apiKey);
        return { langId, targetCode, translatedText: translated.translatedText };
      })
    );

    const translateMs = Date.now() - translateStart;

    const successfulTranslations = translateResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    if (successfulTranslations.length === 0) {
      const firstError = translateResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      logger.error({ err: firstError?.reason }, "All translation requests failed");
      return NextResponse.json({ error: "TRANSLATION_FAILED" }, { status: 500 });
    }

    const ttsStart = Date.now();

    // TTS for all successful translations in parallel
    const ttsResults = await Promise.allSettled(
      successfulTranslations.map(async ({ langId, targetCode, translatedText }) => {
        const tts = await textToSpeech(translatedText, targetCode, apiKey, {
          speaker,
          pace: clampedPace,
        });
        return { langId, translatedText, audioBase64: tts.audioBase64, speaker };
      })
    );

    const ttsMs = Date.now() - ttsStart;
    const totalMs = Date.now() - totalStart;

    const results = ttsResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    if (results.length === 0) {
      const firstTTSError = ttsResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      logger.error({ err: firstTTSError?.reason }, "All TTS requests failed");
      return NextResponse.json({ error: "TTS_FAILED" }, { status: 500 });
    }

    return NextResponse.json({
      results,
      timings: {
        translate: translateMs,
        tts: ttsMs,
        total: totalMs,
      },
    });
  } catch (err) {
    logger.error({ err }, "Test pipeline failed");
    return NextResponse.json({ error: "PIPELINE_FAILED" }, { status: 500 });
  }
}
