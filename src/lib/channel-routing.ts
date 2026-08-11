/**
 * Pure helpers for routing TTS output to the correct per-language streamer.
 * Dependency-free (only the language registry) so routing is unit-testable
 * without FFmpeg, WebSockets, or timers.
 */
import { LANG_BY_BCP47 } from "./language-registry";
import type { RTMPStreamerSnapshot } from "./rtmp-streamer";

/** The subset of TTS output the router needs. */
export type TTSOutputForRouting = {
  audioBase64: string;
  targetLanguage: string; // BCP-47, e.g. "ta-IN"
};

/**
 * Resolve a Sarvam BCP-47 target tag (e.g. "ta-IN") to the short language id
 * used as the per-language streamer key (e.g. "ta"). Returns null for tags
 * outside the registry (e.g. a language the user disabled mid-stream).
 */
export function resolveLanguageId(targetLanguageBcp47: string): string | null {
  return LANG_BY_BCP47[targetLanguageBcp47]?.id ?? null;
}

/**
 * Group a chunk's TTS outputs by their resolved language id, dropping any
 * output whose BCP-47 tag is unknown or whose audio is empty. The pipeline
 * emits at most one output per language per chunk, so each value array is
 * normally length 1.
 */
export function groupTTSPayloadsByLanguage(
  ttsOutputs: TTSOutputForRouting[]
): Map<string, TTSOutputForRouting[]> {
  const grouped = new Map<string, TTSOutputForRouting[]>();
  for (const output of ttsOutputs) {
    if (!output.audioBase64) continue;
    const languageId = resolveLanguageId(output.targetLanguage);
    if (!languageId) continue;
    const group = grouped.get(languageId);
    if (group) group.push(output);
    else grouped.set(languageId, [output]);
  }
  return grouped;
}

/**
 * Merge per-language streamer snapshots into the single snapshot shape the
 * dashboard consumes. Active if any language streamer is active; channels are
 * the concatenation of every language's channel statuses.
 */
export function mergeSnapshots(snapshots: RTMPStreamerSnapshot[]): RTMPStreamerSnapshot {
  return {
    active: snapshots.some((s) => s.active),
    channels: snapshots.flatMap((s) => s.channels),
  };
}
