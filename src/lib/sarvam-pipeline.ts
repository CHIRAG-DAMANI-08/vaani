/**
 * Sarvam AI Pipeline — Server-side STT → Translate → TTS
 *
 * Uses the REST API endpoints:
 *  - POST https://api.sarvam.ai/speech-to-text  (multipart/form-data, file + params)
 *  - POST https://api.sarvam.ai/translate        (JSON body)
 *  - POST https://api.sarvam.ai/text-to-speech   (JSON body, returns base64 audio)
 *
 * Auth: `api-subscription-key` header with the user's decrypted Sarvam key.
 */

import { LANG_MAP } from "./language-registry";
export { LANG_MAP } from "./language-registry";

const SARVAM_BASE = "https://api.sarvam.ai";
const TIMEOUT_MS = 15_000;

// ── Types ──────────────────────────────────────────────────────────────────

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
  /** base64-encoded WAV audio */
  audioBase64: string;
  targetLanguage: string;
};

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

// ── Language mapping ───────────────────────────────────────────────────────

/** Map our channel language IDs to Sarvam BCP-47 codes */
const LANG_MAP: Record<string, string> = {
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
};

// ── STT ────────────────────────────────────────────────────────────────────

/**
 * Transcribe audio to text using Sarvam STT REST API.
 * @param audioBuffer - Raw audio data (WAV/PCM/WebM)
 * @param apiKey - Decrypted Sarvam API key
 * @param mimeType - MIME type of the audio (default: audio/wav)
 */
export async function speechToText(
  audioBuffer: Buffer,
  apiKey: string,
  mimeType = "audio/wav"
): Promise<STTResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Build multipart form data manually for Node.js
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append("file", blob, `chunk.${mimeType === "audio/webm" ? "webm" : "wav"}`);
    formData.append("model", "saarika:v2.5");
    formData.append("language_code", "unknown"); // auto-detect

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

/**
 * Translate text from source language to target language.
 * @param text - Text to translate
 * @param sourceLangCode - BCP-47 source language (e.g. "en-IN")
 * @param targetLangCode - BCP-47 target language (e.g. "hi-IN")
 * @param apiKey - Decrypted Sarvam API key
 */
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
 * Convert text to speech using Sarvam TTS REST API.
 * Returns base64-encoded WAV audio.
 */
export async function textToSpeech(
  text: string,
  targetLangCode: string,
  apiKey: string,
  options?: { speaker?: string; pace?: number }
): Promise<TTSResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const speaker = options?.speaker || "shubh";
  const pace = Math.min(2.0, Math.max(0.5, options?.pace ?? 1.0));

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
        model: "bulbul:v3",
        speaker,
        sample_rate: 24000,
        pace,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`TTS API error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    return {
      audioBase64: data.audios?.[0] || "",
      targetLanguage: targetLangCode,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("TTS request timed out");
    }
    throw err;
  }
}

// ── Full Pipeline ──────────────────────────────────────────────────────────

export type PipelineOptions = {
  speaker?: string;
  pace?: number;
  sourceLang?: string; // override STT detected language (BCP-47, e.g. "en-IN")
};

/**
 * Run the full STT → Translate → TTS pipeline for a single audio chunk.
 *
 * @param audioBuffer - Raw audio data
 * @param apiKey - Decrypted Sarvam API key
 * @param targetLanguages - Array of channel language IDs (e.g. ["hi", "ta"])
 * @param onStageUpdate - Callback for real-time stage status updates
 * @param options - Optional TTS voice settings
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
  let sttTime = 0,
    translateTime = 0,
    ttsTime = 0;

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

    // Determine source language for translation
    // Use override from options if set, otherwise fall back to STT detected language
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

    // Signal stream stage as done
    onStageUpdate?.("stream", "done", { count: ttsOutputs.length });
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Pipeline failed";
    console.error("[pipeline] Error:", error);
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
