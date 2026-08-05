import { logger } from "@/lib/logger";

import { LANG_MAP } from "@/lib/language-registry";
export { LANG_MAP };

const SARVAM_BASE = "https://api.sarvam.ai";
const TIMEOUT_MS = 15000;

export type STTResult = {
  transcript: string;
  languageCode: string;
  confidence: number | null;
};

export type TranslateResult = {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type TTSResult = {
  audioBase64: string;
  targetLanguage: string;
};

// ── STT ────────────────────────────────────────────────────────────────────

export async function speechToText(
  audioBuffer: Buffer,
  apiKey: string,
  options?: { prompt?: string }
): Promise<STTResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" }),
      "input.wav"
    );
    formData.append("model", "saarika:v2");
    formData.append("with_timestamps", "false");

    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }

    const response = await fetch(`${SARVAM_BASE}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`STT API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    return {
      transcript: data.transcript || "",
      languageCode: data.language_code || "unknown",
      confidence: data.language_probability ?? null,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("STT request timed out");
    }
    throw err;
  }
}

// ── Translate ──────────────────────────────────────────────────────────────

export async function translateText(
  text: string,
  sourceLangCode: string,
  targetLangCode: string,
  apiKey: string
): Promise<TranslateResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${SARVAM_BASE}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLangCode,
        target_language_code: targetLangCode,
        mode: "classic-colloquial",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Translate API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    return {
      translatedText: data.translated_text || "",
      sourceLanguage: sourceLangCode,
      targetLanguage: targetLangCode,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Translation request timed out");
    }
    throw err;
  }
}

// ── TTS ────────────────────────────────────────────────────────────────────

/**
 * Speakers that belong to bulbul:v1 model vs bulbul:v3
 */
const BULBUL_V1_SPEAKERS = new Set(["anushka", "manisha", "vidya", "abhilash", "arya", "karun", "hitesh"]);
const FEMALE_SPEAKERS = new Set(["anushka", "manisha", "vidya", "ritu", "priya", "neha", "pooja", "simran", "kavya", "ishita", "shreya", "roopa", "tanya", "shruti", "suhani", "kavitha", "rupali"]);

export async function textToSpeech(
  text: string,
  targetLangCode: string,
  apiKey: string,
  options?: { speaker?: string; pace?: number }
): Promise<TTSResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const reqSpeaker = (options?.speaker || "shubh").toLowerCase();
  const pace = Math.min(2.0, Math.max(0.5, options?.pace ?? 1.0));
  const isFemale = FEMALE_SPEAKERS.has(reqSpeaker);

  // Determine primary model based on speaker registry
  const primaryModel = BULBUL_V1_SPEAKERS.has(reqSpeaker) ? "bulbul:v1" : "bulbul:v3";

  // Build fallback sequence preserving speaker gender
  const attempts = [
    { model: primaryModel, speaker: reqSpeaker },
    { model: primaryModel === "bulbul:v3" ? "bulbul:v1" : "bulbul:v3", speaker: reqSpeaker },
    { model: "bulbul:v1", speaker: isFemale ? "anushka" : "shubh" },
    { model: "bulbul:v3", speaker: isFemale ? "kavya" : "shubh" },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
          text,
          target_language_code: targetLangCode,
          model: attempt.model,
          speaker: attempt.speaker,
          sample_rate: 24000,
          pace,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timeout);
        const data = await response.json();
        if (data.audios?.[0]) {
          return {
            audioBase64: data.audios[0],
            targetLanguage: targetLangCode,
          };
        }
      } else {
        const errText = await response.text().catch(() => "");
        logger.warn({ status: response.status, errText, attempt }, "Sarvam TTS attempt failed, trying fallback");
        lastError = new Error(`TTS API error ${response.status}: ${errText}`);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        clearTimeout(timeout);
        throw new Error("TTS request timed out");
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  clearTimeout(timeout);
  throw lastError || new Error("TTS request failed for all speaker attempts");
}

// ── Full Pipeline ──────────────────────────────────────────────────────────

export type PipelineStageStatus = "idle" | "active" | "done" | "error";

export type PipelineResult = {
  stt: STTResult | null;
  translations: TranslateResult[];
  ttsOutputs: TTSResult[];
  error: string | null;
  /** Time taken for each stage in ms */
  timings: {
    stt: number;
    translate: number;
    tts: number;
    total: number;
  };
};

export type PipelineOptions = {
  speaker?: string;
  pace?: number;
  sourceLang?: string; // override STT detected language (BCP-47, e.g. "en-IN")
};

/**
 * Run the full STT → Translate → TTS pipeline for a single audio chunk.
 * Used by server.ts on the per-user serial queue.
 */
export async function runPipeline(
  audioBuffer: Buffer,
  apiKey: string,
  targetLanguages: string[],
  onStageUpdate?: (stage: string, status: PipelineStageStatus, data?: any) => void,
  options?: PipelineOptions
): Promise<PipelineResult> {
  const totalStart = Date.now();
  let sttResult: STTResult | null = null;
  const translations: TranslateResult[] = [];
  const ttsOutputs: TTSResult[] = [];
  let error: string | null = null;
  let sttTime = 0, translateTime = 0, ttsTime = 0;

  try {
    // ── Stage 1: STT ──
    onStageUpdate?.("stt", "active");
    const sttStart = Date.now();
    sttResult = await speechToText(audioBuffer, apiKey);
    sttTime = Date.now() - sttStart;
    onStageUpdate?.("stt", "done", { transcript: sttResult.transcript, time: sttTime });

    if (!sttResult.transcript.trim()) {
      onStageUpdate?.("translate", "idle");
      onStageUpdate?.("tts", "idle");
      return {
        stt: sttResult,
        translations: [],
        ttsOutputs: [],
        error: null,
        timings: { stt: sttTime, translate: 0, tts: 0, total: Date.now() - totalStart },
      };
    }

    // Source lang override from TTS settings, else STT-detected language
    const sourceLang = options?.sourceLang || sttResult.languageCode || "en-IN";

    // ── Stage 2: Translate (parallel for all target languages) ──
    onStageUpdate?.("translate", "active");
    const transStart = Date.now();

    const translatePromises = targetLanguages.map(async (langId) => {
      const targetCode = LANG_MAP[langId];
      if (!targetCode) return null;

      // Skip translation if source and target are the same
      if (sourceLang === targetCode) {
        return {
          translatedText: sttResult!.transcript,
          sourceLanguage: sourceLang,
          targetLanguage: targetCode,
        } as TranslateResult;
      }

      return translateText(sttResult!.transcript, sourceLang, targetCode, apiKey);
    });

    const translateResults = await Promise.allSettled(translatePromises);
    for (const result of translateResults) {
      if (result.status === "fulfilled" && result.value) {
        translations.push(result.value);
      }
    }
    translateTime = Date.now() - transStart;
    onStageUpdate?.("translate", "done", { count: translations.length, time: translateTime });

    // ── Stage 3: TTS (parallel for all translations) ──
    onStageUpdate?.("tts", "active");
    const ttsStart = Date.now();

    const ttsPromises = translations.map(async (tr) => {
      return textToSpeech(tr.translatedText, tr.targetLanguage, apiKey, {
        speaker: options?.speaker,
        pace: options?.pace,
      });
    });

    const ttsResults = await Promise.allSettled(ttsPromises);
    for (const result of ttsResults) {
      if (result.status === "fulfilled" && result.value) {
        ttsOutputs.push(result.value);
      }
    }
    ttsTime = Date.now() - ttsStart;
    onStageUpdate?.("tts", "done", { count: ttsOutputs.length, time: ttsTime });

    onStageUpdate?.("stream", "done", { count: ttsOutputs.length });
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Pipeline failed";
    logger.error({ err: error }, "Pipeline stage failed");
  }

  return {
    stt: sttResult,
    translations,
    ttsOutputs,
    error,
    timings: {
      stt: sttTime,
      translate: translateTime,
      tts: ttsTime,
      total: Date.now() - totalStart,
    },
  };
}
