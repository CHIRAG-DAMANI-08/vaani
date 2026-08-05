# Stack Research

**Domain:** Real-time multilingual audio translation (Vaani) — milestone v1.2: per-language voice+pace, latency-vs-quality mode
**Researched:** 2026-08-05
**Confidence:** HIGH (no new deps needed — code-level evidence); MEDIUM on Sarvam API naming currency

## Bottom Line

**Neither feature requires a single new dependency.** Both are pure application-code wiring on the stack Vaani already ships:

1. **Per-language voice + pace** — the Sarvam TTS API already accepts per-request `speaker` and `pace`; `textToSpeech()` already forwards them per call. The only gap is that `runPipeline` applies ONE global `{speaker, pace}` to all language TTS calls. Fix: pass a per-language override map through `runPipeline` and fall back to global per channel.
2. **Latency-vs-quality mode** — the chunk size is a local constant (`CHUNK_SIZE = 32000 * 3` in `server.ts`'s `startAudioExtraction()`). It becomes a per-user value read from a mode. No audio-library changes, no new packages.

The **only** real cost is an RTMP architecture prerequisite (see Critical Prerequisite below): the current tee-muxer can't send *distinct* audio per output channel, which makes per-language voice meaningless at the RTMP layer until fixed.

## Recommended Stack

### Core Technologies (unchanged — milestone touches these, no versions change)

| Technology | Version (in repo) | Purpose | Why Recommended |
|------------|-------------------|---------|-----------------|
| Sarvam TTS (`bulbul:v3` via `textToSpeech`) | — | Per-call TTS voice + pace | Confirmed by official docs: per-request `speaker` and `pace` params. `pace` valid range for v3 is 0.5–2.0 — matches the code's existing clamp exactly (`Math.min(2.0, Math.max(0.5, ...))`). No API work needed. |
| `src/lib/sarvam-pipeline.ts` `runPipeline` | — | Pipeline orchestrator | Only application change point for per-language voice: TTS map must resolve `{speaker, pace}` per target language, falling back to the global `PipelineOptions`. |
| Mongoose `Channel` model (`src/lib/models/channel.ts`) | mongoose 9.3.3 | Per-language TTS config persistence | Add two optional fields (`speaker: String`, `pace: Number`, default `null`). No schema lib changes. |
| Custom Node server (`server.ts`) | Node 22 / tsx | WebSocket + chunking + extraction | Latency mode lives here: `userLatencyModes` Map + `SET_LATENCY_MODE` WS handler + mode-driven `CHUNK_SIZE` in `startAudioExtraction()`. Reuses the existing `SET_TRANSLATION_SOURCE` hot-reload pattern (stop extractor → 1s → restart). |
| `language-registry.ts` (`LANG_BY_BCP47`) | — | Language ID ↔ BCP-47 mapping | Required wiring: pipeline translations carry `targetLanguage` as BCP-47 (`hi-IN`) but channel config is keyed by short id (`hi`). Reverse lookup already exists. |
| `src/app/api/channels/route.ts` | — | Channel CRUD | POST must accept/validate `speaker` + `pace`; GET must include them. |
| `src/app/(dashboard)/channels/page.tsx` | — | Per-channel config UI | Add speaker select + pace control to the edit form. Reuse the speaker list already in `TTSSettingsSection.tsx`. |
| `src/app/(dashboard)/settings/TTSSettingsSection.tsx` | — | Latency mode UI | Add Snappy/Balanced/Studio picker; send via existing `obs-relay-client` WS path (mirror `SET_TTS_SETTINGS`). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **None added.** `ffmpeg-static` (5.3.0, already installed) | — | Audio extraction / RTMP relay | Covers both features. Latency mode only changes the extraction chunk-size constant in `server.ts`; per-channel routing (if the prerequisite refactor is done) only changes FFmpeg arg/process management in `rtmp-streamer.ts`. No new FFmpeg dependency. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| None added | — | Zod 4.3.6 is already a dependency — use it for `pace` (0.5–2.0) and `speaker` (whitelist) validation in the channels POST route if validation exists there; otherwise plain guards match the file's current style. |

## Critical Prerequisite (read before scoping the feature)

**The current RTMP relay cannot send different audio to different channels — the per-language voice feature is architecturally moot until this is addressed.**

Evidence (`src/lib/rtmp-streamer.ts`, `spawnFFmpeg()`):
- ONE FFmpeg process per user, ONE audio input (`-i pipe:0`), audio mixed once via `sidechaincompress` + `amix`, then `-map [final_audio]` and `-f tee` to **all** RTMP destinations.
- `executeChunkPipeline` in `server.ts` pushes **every** language's TTS output sequentially into that single stdin: `for (const ttsOutput of result.ttsOutputs) streamer.pushAudio(...)`.
- Result: every viewer today hears the *mix* of all enabled languages, on every channel.

Implication: giving each language its own voice only changes the mix composition unless per-channel audio routing exists. FFmpeg's tee muxer writes the **same mapped stream set** to every output — it cannot select different audio per output. The fix is per-channel FFmpeg processes (one stdin per language → one RTMP target), which is a refactor of `RTMPStreamer` (process lifecycle, restart/backpressure logic, `ChannelRTMPConfig`), **not** a new dependency. Flag this for the roadmap: it is the single largest hidden cost of v1.2.

If the milestone accepts the current mixed-audio behavior as-is, per-language voice is cosmetic. Decide explicitly.

## Installation

```bash
# No new packages. Zero npm changes for either feature.
npm install   # only if not already installed — verifies existing tree
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Per-call TTS params via existing `textToSpeech()` | A separate TTS engine / ElevenLabs / Azure | Only if Sarvam voice coverage or quality for a target language becomes unacceptable. Not justified by these two features. |
| Mode-driven `CHUNK_SIZE` constant in `startAudioExtraction()` | Switch to Sarvam WebSocket **streaming** STT for true low-latency | Streaming STT is a rearchitecture, not a constant. It could lower latency far more than chunk-size changes (latency today is dominated by STT+translate+TTS call time, not buffering). Scope creep for v1.2 — keep as a documented future direction. |
| Per-channel FFmpeg processes for distinct audio routing | `-f tee` with per-output stream selection | Not possible: tee sends the same stream set to all outputs. Separate processes is the only pure-FFmpeg path. |
| Persist latency mode on `User` model | In-memory `userLatencyModes` Map (parity with existing `userTTSSettings`) | Persistence is nice-to-have. Existing TTS settings are localStorage + WS only. Match that pattern for v1.2; DB persistence later. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any new npm package for these two features | Both features are configuration on existing APIs/constants. `textToSpeech` already passes `speaker`/`pace`; `CHUNK_SIZE` is already a local constant. | Existing `sarvam-pipeline.ts`, `server.ts`, Mongoose, `ws`. |
| Streaming STT (WebSocket) to implement "Snappy" | Milestone scopes latency mode to chunk size. Streaming STT changes the entire pipeline/queue/state model and rate-limit profile. | Mode-driven chunk-size constant. Revisit only if measured latency doesn't improve enough. |
| New STT/TTS model names as part of this work | Code sends `saarika:v2` (STT) and `target_language_code` (TTS); current official docs list `saaras:v3/v4` and `language_code`. The shipped code works, but the naming is stale per docs. Changing models mid-feature adds risk. | Keep current models; log a validation task to confirm they're not deprecated. (See Pitfalls.) |

## Stack Patterns by Variant

**If the per-channel RTMP routing refactor is in scope (recommended):**
- Use one FFmpeg process per channel: `ChannelRTMPConfig` gains the TTS input pipe, `server.ts` pushes each language's TTS output to the matching channel's streamer (map by `languageId`), reusing existing `ffmpeg-static` spawn + restart + backpressure logic.
- Because each language's TTS audio differs, the global "mix + duck" filter applies only where the streamer is a single-language relay.

**If the per-channel routing refactor is deferred:**
- Ship per-language voice config through the full DB/API/UI/pipeline path anyway (so `runPipeline` emits per-language voices), and treat the RTMP mix as a known limitation. Feature value is only realized after the refactor — decide this in the roadmap, don't let it default.

**For latency mode values (proposed):**
- Snappy ≈ 2.0s (16000*2 = 32000 bytes), Balanced = 3.0s (current, 96000 bytes), Studio ≈ 4.0–5.0s (128000–160000 bytes).
- **Do not default Snappy to 1.0s** — the existing comment in `server.ts` documents that 1s chunks caused aggressive STT hallucination with the current model. Smallest justified step is a test at 2.0s, then evaluate.
- Re-check the VAD thresholds (`rms >= 150`, `zcr >= 100`) per mode: they were tuned against 3s chunks, and shorter chunks change RMS/ZCR distributions. `bufferPercent` UI math also references `CHUNK_SIZE` — keep it reading the same per-mode value.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| mongoose 9.3.3 | Any Mongoose schema | Adding optional `speaker`/`pace` fields is a backward-compatible schema evolution; existing documents read as `null`. |
| ffmpeg-static 5.3.0 | Node 22 | Already the source of `ffmpegPath` for both extraction and relay. No version change. |
| `ws` 8.20.0 | Node 22 | `SET_LATENCY_MODE` is just another JSON message type on the existing `/ws/relay` — no protocol-version change. |
| Sarvam TTS `pace` 0.5–2.0 | bulbul:v3 | Code clamp already matches documented v3 range. Keep the clamp in `textToSpeech()`; per-channel `pace` inherits it automatically. |

## Concrete Change Map (for the roadmap)

| File | Change |
|------|--------|
| `src/lib/models/channel.ts` | Add `speaker: { type: String, default: null }`, `pace: { type: Number, default: null }` |
| `src/app/api/channels/route.ts` | POST: accept `speaker` (whitelist), `pace` (number, clamp 0.5–2.0); GET: include both in the merged channel payload |
| `src/app/(dashboard)/channels/page.tsx` | Edit form: speaker `<select>` (reuse `SPEAKERS` from `TTSSettingsSection.tsx`) + pace slider; send with `handleSave` |
| `src/lib/sarvam-pipeline.ts` | `runPipeline` gains `perLanguageVoice?: Record<string, { speaker?: string; pace?: number }>`; in the TTS map resolve per `targetLanguage` (via `LANG_BY_BCP47` to short id) with fallback to global `options` |
| `server.ts` | `getCachedCredentials` returns channel docs (or a `Map<langId, {speaker, pace}>`) alongside `apiKey`/`languages`; `executeChunkPipeline` builds `perLanguageVoice` and passes it; add `userLatencyModes` Map + `SET_LATENCY_MODE` handler; `startAudioExtraction` reads the mode for `CHUNK_SIZE`; hot-reload on mode change (existing 1s pattern) |
| `src/app/(dashboard)/settings/TTSSettingsSection.tsx` | Latency mode picker (Snappy/Balanced/Studio), sent via `obs-relay-client` WS (mirror `SET_TTS_SETTINGS`) |

## Sources

- Official Sarvam docs, Text-to-Speech API reference (fetched 2026-08-05): per-request `speaker`, `pace` (0.5–2.0 for bulbul:v3), `language_code`, `speech_sample_rate` — HIGH confidence. URL: https://docs.sarvam.ai/api-reference/text-to-speech
- Official Sarvam docs, Speech-to-Text API reference (fetched 2026-08-05): REST is "quick responses under 30 seconds," no stated minimum duration; docs list `saaras:v3/v4`, code uses `saarika:v2` — MEDIUM/LOW confidence on model-name currency. URL: https://docs.sarvam.ai/api-reference/speech-to-text
- Repo primary evidence (HIGH): `server.ts` (chunk constant, hot-reload pattern, `userTTSSettings`, `getCachedCredentials`), `src/lib/sarvam-pipeline.ts` (per-call TTS options, global-only speaker/pace), `src/lib/rtmp-streamer.ts` (single stdin + tee muxer), `src/lib/models/channel.ts`, `src/app/api/channels/route.ts`.
- WebSearch for "saarika deprecation" returned no usable results — LOW confidence, unresolved. Flag for validation before any model-adjacent work.

---
*Stack research for: Vaani milestone v1.2 — per-language voice + latency mode*
*Researched: 2026-08-05*
