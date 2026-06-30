/**
 * Vaani Language Registry
 *
 * Single source of truth for all supported translation/TTS languages.
 * Replaces the hardcoded LANG_MAP in sarvam-pipeline.ts.
 *
 * Adding a new language: add one entry to LANGUAGE_REGISTRY.
 * All consumers (pipeline, channel model, settings UI) read from here.
 */

export type LanguageEntry = {
  /** Short ID used in DB/channels (e.g. "hi") */
  id: string;
  /** BCP-47 code for Sarvam APIs (e.g. "hi-IN") */
  bcp47: string;
  /** Human-readable display name */
  name: string;
  /** Native script name */
  nativeName: string;
  /** Flag emoji */
  flag: string;
  /** Sarvam TTS voice — bulbul:v3 has per-language optimal speakers */
  defaultSpeaker: string;
};

export const LANGUAGE_REGISTRY: LanguageEntry[] = [
  {
    id: "hi",
    bcp47: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    defaultSpeaker: "shubh",
  },
  {
    id: "ta",
    bcp47: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    flag: "🇮🇳",
    defaultSpeaker: "arjun",
  },
  {
    id: "te",
    bcp47: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    flag: "🇮🇳",
    defaultSpeaker: "arjun",
  },
  {
    id: "bn",
    bcp47: "bn-IN",
    name: "Bengali",
    nativeName: "বাংলা",
    flag: "🇮🇳",
    defaultSpeaker: "anushka",
  },
  {
    id: "kn",
    bcp47: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    flag: "🇮🇳",
    defaultSpeaker: "arvind",
  },
  {
    id: "ml",
    bcp47: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    flag: "🇮🇳",
    defaultSpeaker: "amartya",
  },
  {
    id: "gu",
    bcp47: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    flag: "🇮🇳",
    defaultSpeaker: "amol",
  },
  {
    id: "pa",
    bcp47: "pa-IN",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    flag: "🇮🇳",
    defaultSpeaker: "arjun",
  },
];

/** Map from short ID → BCP-47 code (e.g. "hi" → "hi-IN") */
export const LANG_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGE_REGISTRY.map((l) => [l.id, l.bcp47])
);

/** Map from BCP-47 → LanguageEntry for reverse lookups */
export const LANG_BY_BCP47: Record<string, LanguageEntry> = Object.fromEntries(
  LANGUAGE_REGISTRY.map((l) => [l.bcp47, l])
);

/** Map from short ID → LanguageEntry */
export const LANG_BY_ID: Record<string, LanguageEntry> = Object.fromEntries(
  LANGUAGE_REGISTRY.map((l) => [l.id, l])
);

/** Get display name for a language ID or BCP-47 code */
export function getLanguageName(idOrBcp47: string): string {
  const byId = LANG_BY_ID[idOrBcp47];
  if (byId) return byId.name;
  const byBcp = LANG_BY_BCP47[idOrBcp47];
  if (byBcp) return byBcp.name;
  return idOrBcp47;
}

/** Get flag for a language ID or BCP-47 code */
export function getLanguageFlag(idOrBcp47: string): string {
  const byId = LANG_BY_ID[idOrBcp47];
  if (byId) return byId.flag;
  const byBcp = LANG_BY_BCP47[idOrBcp47];
  if (byBcp) return byBcp.flag;
  return "🌐";
}
