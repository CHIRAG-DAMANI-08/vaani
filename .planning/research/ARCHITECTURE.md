# Architecture Research

**Domain:** Vaani milestone v1.2 — per-language TTS voice+pace + latency-vs-quality mode, integrated into the existing single-process pipeline (server.ts → runPipeline → RTMPStreamer)
**Researched:** 2026-08-05
**Confidence:** HIGH on code-level integration paths (read all 5 load-bearing modules); MEDIUM on Sarvam API-name currency and NMS multi-play behavior

## Executive Decision

The milestone has **one architectural prerequisite** and two small wiring features:

1. **CRITICAL — RTMP routing must become per-channel.** The current `RTMPStreamer` runs ONE FFmpeg `tee` process that mixes **all** TTS languages into **every** output channel (`server.ts` pushes every `ttsOutput` into the streamer's single stdin; the tee duplicates that one mixed audio to all destinations). With per-language voices this is not just a quality issue — it is a correctness bug: every channel would broadcast every language's voice. This must be fixed before or with per-channel voice.
2. **Per-language voice+pace** = add `speaker`/`pace` to the Channel model (DB), extend the pipeline-credential cache, resolve per-channel TTS opts in `runPipeline`, add UI.
3. **Latency mode** = one new per-user in-memory Map + a `SET_LATENCY_MODE` WS message that reuses the existing `SET_TRANSLATION_SOURCE` hot-reload pattern; only the `CHUNK_SIZE` constant becomes mode-driven.

**No new dependencies.** All three are application-code changes on the shipped stack (matches `.planning/research/STACK.md`).

## System Overview

### Today (v1.1)

```
OBS ──RTMP:1935──► NMS ──► [FFmpeg extractor] PCM 16k mono ──► VAD ──► [3s chunk] ──► per-user serial queue
                                                                                        │
                                                                                        ▼
                                                                    runPipeline: STT → Translate(N parallel) → TTS(N parallel)
                                                                                        │  ttsOutputs[{audioBase64, targetLanguage(BCP-47)}]
                                                                                        ▼
                                                        [ONE RTMPStreamer: 1 FFmpeg tee] ──► same mixed audio → every RTMP channel ◄── ✗ all languages merged
```

### After v1.2 (target)

```
OBS ──RTMP:1935──► NMS ──► [FFmpeg extractor] PCM 16k mono ──► VAD ──► [mode-sized chunk: 1.5s|3s|5s] ──► per-user serial queue
                                                                                                            │
                                                                                                            ▼
                                                        runPipeline(ttsPerLanguage): STT → Translate(N) → TTS(N, per-channel speaker/pace)
                                                                                                            │  ttsOutputs[{audioBase64, targetLanguage}]
                                                                                                            ▼
                                        [ONE RTMPStreamer: 1 FFmpeg, N TTS stdins, tee + per-output select]
                                                   ├─► channel A: video + duck(original audio, voiceA)
                                                   ├─► channel B: video + duck(original audio, voiceB)  ◄── ✓ each channel hears only its own language
                                                   └─► channel C: ...
```

**Data sources for the two new knobs:**
- Per-channel voice+pace: **DB** (Channel doc) → credential cache → `runPipeline` — survives reconnect, applies at next GO_LIVE, ≤60s mid-session.
- Latency mode: **in-memory** per-user Map + WS message — ephemeral runtime preference, like translation source.

## Critical Prerequisite: Per-Channel RTMP Audio Routing

### Why the current design blocks the milestone

`rtmp-streamer.ts`'s `spawnFFmpeg()` builds one tee muxer over one TTS stdin (input 1) and one ingest read (input 0). `executeChunkPipeline` in `server.ts` (lines 311-320) does:

```typescript
for (const ttsOutput of result.ttsOutputs) {
  if (ttsOutput.audioBase64) streamer.pushAudio(ttsOutput.audioBase64); // all languages → one stdin
}
```

Every destination receives the concatenation of every language's audio. Fine when only one channel is enabled (the de-facto v1.x usage); untenable the moment per-language voice ships.

### Option A: One `RTMPStreamer` instance per channel
- `rtmp-streamer.ts`: **zero changes** (it already accepts 1..N channels; pass one).
- `server.ts`: `activeStreamers` becomes `Map<channelId, RTMPStreamer>` (or `Map<userId, Map<channelId, RTMPStreamer>>`); `handleGoLive` spawns one per RTMP-configured channel; `executeChunkPipeline` routes each `ttsOutput` to the matching channel streamer; all ~8 `getSnapshot()`/`stop()` call sites aggregate over N instances.
- **Risks:** (1) N FFmpeg processes each re-read the same NMS ingest for video+ducking — Node-Media-Server's multi-play-consumer support is historically flaky (MEDIUM confidence; could not verify via search today). (2) N video encodes of the same input. (3) Server.ts lifecycle churn (~15-20 touch points).

### Option B: One FFmpeg, N TTS inputs, tee with per-output `select` (recommended)
- `rtmp-streamer.ts`: the **only** file with real change. `start()` accepts per-channel TTS configs; `spawnFFmpeg()` builds N s16le stdins (one per channel) + N sidechain mixes; `pushAudio(channelId, base64)` fans audio into the right queue; each queue gets its own 100ms silence pump. Tee outputs carry a per-output stream selection:
  ```
  [f=flv:onfail=ignore:select='0:v:0,1:a']urlA|[f=flv:onfail=ignore:select='0:v:0,2:a']urlB
  ```
- Filter graph per channel i: `[0:a]channelsplit[desktop][mic];[desktop][i:a]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=1000[a_i]` (FFmpeg allows one link like `[desktop]` to fan into N consumers). Mono fallback likewise per input.
- `server.ts`: streamer lifecycle (snapshots, stops, shutdown, `activeStreamers` Map) is **untouched** — the single-streamer-per-user abstraction survives. Only `pushAudio` gains a `channelId` arg, and the pipeline→streamer handoff selects the right channel.
- **Risks:** the `tee` `select` syntax + quote escaping is the one finicky bit. Mitigate with a standalone FFmpeg spike (throw the command at a test ingest before wiring JS), and keep the existing `safeUrl` escaping helper.

### Recommendation

**Option B.** It keeps a single ingest read (no NMS multi-play bet), keeps server.ts's streamer lifecycle code intact, holds the FFmpeg process count flat (1 extractor + 1 streamer per active user regardless of language count), and concentrates all risk in the one file that already owns FFmpeg arg-building. Option A wins only on "no edits to rtmp-streamer.ts" but trades that for NMS risk, N ingest readers, and broad server.ts churn. **Validate with a phase-0 spike:** confirm `select='0:v:0,1:a'` routes distinct audio per tee output on the real NMS ingest before building on it.

### TTS-output → channel mapping (needed by both options)

`ttsOutputs[].targetLanguage` is a **BCP-47 code** (`hi-IN`), but channels are keyed by **short id** (`hi`). The reverse lookup already exists: `LANG_BY_BCP47` in `src/lib/language-registry.ts`. `executeChunkPipeline` should carry the cached channel configs (with short ids) and resolve `bcp47 → languageId → channelId` before pushing audio. Channels enabled without an RTMP config get no streamer and simply remain transcript-only.

## Component Responsibilities

| Component | Responsibility | Change for v1.2 |
|-----------|---------------|-----------------|
| `server.ts` (`startAudioExtraction`) | PCM 16k mono extraction + VAD + chunking | `CHUNK_SIZE` becomes `32000 * secondsForMode`; read from new `userLatencyModes` Map (default `balanced` = 3s, current behavior) |
| `server.ts` (WS handler) | Runtime command channel | Add `SET_LATENCY_MODE {mode}` — mirror `SET_TRANSLATION_SOURCE` exactly: set Map, then hot-reload extractor (stop → 1s → restart) if streaming |
| `server.ts` (`getCachedCredentials`) | Per-session API key + language cache (60s TTL) | Cache the enabled channel **configs** (short id, speaker, pace) instead of bare `languageId`s; keep the same TTL/epoch machinery |
| `server.ts` (`executeChunkPipeline`) | Orchestrates one chunk through `runPipeline`, pushes audio to streamer | Build `ttsPerLanguage` from cached channel configs + global fallback; pass channelId when pushing audio |
| `src/lib/sarvam-pipeline.ts` (`runPipeline`) | STT → Translate(N) → TTS(N) | New `PipelineOptions.ttsPerLanguage?: Record<shortId, {speaker?, pace?}>`; TTS stage resolves `channel ?? global ?? "shubh" / 1.0`. Optionally wire `speechToText`'s unused `options.prompt` with recent transcript for short chunks |
| `src/lib/models/channel.ts` | Channel persistence | Add `speaker: String` (default null) + `pace: Number` (default null); null = inherit global |
| `src/app/api/channels/route.ts` | Channel CRUD | POST validates + stores `speaker`/`pace`; GET returns them |
| `src/app/(dashboard)/channels/page.tsx` | Per-channel config UI | Speaker select + pace slider in the edit form, with a "Default (use global)" option |
| `src/app/(dashboard)/settings/TTSSettingsSection.tsx` | Global TTS + new latency mode UI | Add Snappy/Balanced/Studio picker → `obsRelayManager` WS; note: pace state/handler exist here but **no pace control is currently rendered** — surface one while touching this file |
| `src/lib/obs-relay-client.ts` | WS client facade | Add `setLatencyMode(mode)` → `{type:"SET_LATENCY_MODE", mode}`; persist mode in localStorage and re-sync on PING (mirror the TTS-settings resync block at lines 215-222) |

## Data Flow

### Per-channel voice + pace

```
Channels page (POST /api/channels {languageId, speaker, pace})
    → Channel doc {speaker?, pace?}
    → server.ts getCachedCredentials (cache miss ≤60s) → creds.channels[{languageId, speaker, pace}]
    → executeChunkPipeline: ttsPerLanguage[languageId] = channel.speaker ?? globalTTSSettings.speaker ?? "shubh"
    → runPipeline TTS stage → textToSpeech(..., {speaker, pace}) per translation
    → ttsOutputs[{audioBase64, targetLanguage}] → LANG_BY_BCP47 → channelId → streamer.pushAudio(channelId, audio)
```

**Precedence rule (single line of truth):** `channel.speaker ?? userTTSSettings.speaker ?? "shubh"`; same for pace (`?? 1.0`). `sourceLang` stays **global-only** — it is a detection concern, not an output concern, so it does not move to channels.

**Apply latency:** the credential cache is wiped at every `clearPipelineState` (session stop / GO_LIVE / OBS disconnect — server.ts lines 112-127), so changes always apply at the next GO_LIVE. **Mid-session** edits land within the 60s cache TTL. That is acceptable for a voice tweak; do NOT build a WS override map (dual source of truth) unless instant mid-stream apply becomes a requirement.

### Latency mode

```
Settings UI → obsRelayManager.setLatencyMode(mode) → WS {type:"SET_LATENCY_MODE", mode}
    → server.ts userLatencyModes.set(userId, mode)
    → if activeAudioExtractors.has(userId): stop → 1s → restart (exact SET_TRANSLATION_SOURCE pattern, lines 810-823)
    → startAudioExtraction reads mode → CHUNK_SIZE = 32000 * {snappy:1.5, balanced:3, studio:5}
```

Chunk-size table (16kHz 16-bit mono, 32000 bytes/sec):

| Mode | Chunk seconds | CHUNK_SIZE bytes | Effect |
|------|--------------|------------------|--------|
| Snappy | 1.5 (floor — see pitfall) | 48,000 | ~1.5s less wait-to-fill per chunk; more API calls/sec |
| Balanced | 3 (current) | 96,000 | status quo; documented as the accuracy/speed sweet spot in the code comment |
| Studio | 5 | 160,000 | fewer, longer STT calls; better context/accuracy; higher floor latency |

## Architectural Patterns to Follow

### Pattern 1: Per-user in-memory config Map + extractor hot-reload
**What:** `userTranslationSources` + `SET_TRANSLATION_SOURCE` already owns "runtime knob that changes FFmpeg extraction behavior live." 
**When:** latency mode is the identical shape.
**Example:** `SET_LATENCY_MODE` → `userLatencyModes.set(userId, mode)` → `stopAudioExtraction(userId)` → `setTimeout(startAudioExtraction, 1000)`.
**Trade-offs:** settings are ephemeral (not persisted), and the stop/start drops the in-flight partial chunk (~1 chunk of audio). Both are already accepted for translation source.

### Pattern 2: DB-backed per-channel config + per-session cache with TTL
**What:** `getCachedCredentials` already caches per-user credentials for 60s, invalidated by `clearPipelineState` at session boundaries.
**When:** per-channel voice must survive reconnect, so it must live in MongoDB, not a WS map.
**Example:** extend the cached payload from `{apiKey, languages}` to `{apiKey, channels: [{languageId, speaker, pace}]}`; derivation of `languages` stays.
**Trade-offs:** mid-session edits take ≤60s. Accept it; document it.

### Pattern 3: Serial pipeline queue + epoch guard (unchanged)
**What:** one chunk at a time per user, `epoch` bump prevents stale drain loops after session restart.
**When:** latency mode changes chunk *size upstream* of the queue; the queue and epoch logic need **zero** changes. Do not touch `processAudioChunk`/`drainPipelineQueue`.

### Pattern 4: Single-process shared state
**What:** `server.ts` Maps + global-preserving singletons (`sessionManager`, `activeObsStatus`).
**When:** all new state (`userLatencyModes`, cached channel configs) lives in the same maps, survives HMR via the `global` pattern used elsewhere. No new infra, no cross-process messaging.

## Anti-Patterns

### Anti-Pattern 1: Shipping per-channel voice without fixing RTMP routing
**What people do:** add `speaker`/`pace` to channels and `runPipeline`, leave the single-tee mixer.
**Why it's wrong:** every output channel broadcasts every language's audio — the feature is both broken and worse than v1.1 (which was a latent bug masked by single-channel usage).
**Do this instead:** land the Option B routing change in the same milestone, or explicitly gate per-channel voice on it.

### Anti-Pattern 2: Per-channel voice as a WS-message in-memory map
**What people do:** mirror `SET_TTS_SETTINGS` with `SET_CHANNEL_VOICE` to get instant apply.
**Why it's wrong:** settings vanish on reconnect/refresh; two sources of truth (map vs DB) drift; `handleGoLive` would need to re-merge them.
**Do this instead:** DB + credential cache (≤60s apply). Only add a WS path if a concrete product requirement demands sub-60s mid-stream voice changes.

### Anti-Pattern 3: Snappy below ~1.5s with no STT context
**What people do:** set snappy to 1s because it looks fast.
**Why it's wrong:** the code comment at `server.ts:415-416` records that 1s chunks made Sarvam's STT hallucinate random words; Sarvam docs give **no** minimum duration (verified) — the floor is empirical.
**Do this instead:** keep snappy ≥1.5s, and wire `speechToText`'s already-supported `prompt` option (currently never called) with the previous transcript line as context for short chunks. Verify hallucination rate with a real 1.5s sample before shipping.

### Anti-Pattern 4: Offering unvalidated speaker names in the per-channel picker
**What people do:** reuse the current `SPEAKERS` list as-is.
**Why it's wrong:** Sarvam's official bulbul docs list the v3-compatible speakers (`shubh` + 36 others; v2-only: anushka, abhilash, manisha, vidya, arya, karun, hitesh). The app's `SPEAKERS` and `language-registry.defaultSpeaker` include **arjun, arvind, amol, amartya — absent from the official list** (MEDIUM-LOW confidence: could not re-verify via live API today). The existing fallback chain (sarvam-pipeline.ts lines 157-162) silently substitutes `shubh`, so an invalid choice looks "fine" while delivering the wrong voice.
**Do this instead:** validate every offered speaker against the live TTS API once (or drop to the official v3 list) before the per-channel picker ships. Note Sarvam docs impose **no per-language speaker constraint** — any v3 speaker can serve any supported language, so no per-language whitelist is needed; the registry's `defaultSpeaker` remains a sensible seed.

### Anti-Pattern 5: Changing the audio-push contract in server.ts per-feature
**What people do:** sprinkle channelId-aware pushes across all call sites.
**Why it's wrong:** couples server.ts to tee details and spreads the diff.
**Do this instead:** keep `pushAudio(channelId, base64)` inside `rtmp-streamer.ts` (Option B); server.ts just passes the resolved channelId.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 active streamer, 1-3 languages | Option B single FFmpeg, N inputs. Process count flat. Nothing to tune. |
| 1 active streamer, 6-8 languages | Watch ingest read + encode CPU (still one process); snappy mode roughly doubles API call rate — watch Sarvam rate limits and the per-user queue backing up (MAX_QUEUE_SIZE 10 drops oldest). |
| 10+ concurrent streamers | First bottleneck is the per-user serial queue × API concurrency (already rate-limited by design). Second is FFmpeg process count (N extractors + N streamers) and NMS ingest throughput. Beyond this, extract pipeline into a worker pool / message queue — well past this milestone. |

**Cost note:** `sessionManager.recordChunkProcessed` estimates cost per chunk; snappy increases chunks/sec, so the dashboard cost estimate rises roughly proportionally with the shorter chunk size. That is directionally correct (more STT calls) but should be surfaced in the latency-mode UI copy.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Channels page ↔ `/api/channels` | REST POST/GET | `speaker`/`pace` added to body + response; CSRF + URL validation patterns unchanged |
| `/api/channels` ↔ server.ts | none (no change needed) | The credential cache's 60s TTL + session-boundary wipe is the sync mechanism; no cross-module invalidation to build |
| Settings UI ↔ `obs-relay-client` → WS | `SET_LATENCY_MODE` | Mirror `SET_TTS_SETTINGS`; also persist + resync on PING |
| WS handler ↔ `startAudioExtraction` | shared `userLatencyModes` Map | Hot-reload pattern identical to `SET_TRANSLATION_SOURCE` |
| `runPipeline` ↔ `textToSpeech` | direct call, per translation | `ttsPerLanguage[langId] ?? global` resolution inside `runPipeline` |
| `executeChunkPipeline` ↔ `RTMPStreamer` | `pushAudio(channelId, base64)` | New channelId arg; resolves `targetLanguage` (BCP-47) → short id → channelId |
| `runPipeline` ↔ STT | `speechToText(audioBuffer, apiKey, {prompt})` | Optional; `prompt` param already exists, currently unused — cheap mitigation for snappy hallucinations |

### Protocol Summary

| Message | Status | Role in v1.2 |
|---------|--------|-------------|
| `GO_LIVE` | **unchanged** | Payload-less trigger; sessions actually start from RTMP `postPublish` → `handleGoLive`, so there is no client `GO_LIVE` to extend |
| `SET_TTS_SETTINGS` | **unchanged** | Remains the *global* fallback (`userTTSSettings`); per-channel values override it at the resolution step |
| `SET_LATENCY_MODE` | **new** | `{mode: "snappy"|"balanced"|"studio"}`; ephemeral runtime knob, hot-reloads extractor |
| `SET_TRANSLATION_SOURCE` | unchanged | Template the latency mode was copied from |
| `SESSION_SNAPSHOT` | additive | Optionally echo `latencyMode` so the UI can render the active mode after reconnect |

## Sources

- Official Sarvam docs, text-to-speech convert reference (`docs.sarvam.ai/api-reference/text-to-speech/convert.md`): v3 speaker set, no per-language speaker constraint, pace 0.5-2.0 for v3, default 1.0. HIGH confidence.
- Official Sarvam docs, speech-to-text reference (`docs.sarvam.ai/api-reference/speech-to-text/transcribe.md`): no documented minimum audio duration; notes REST is for "under 30 seconds" responses. HIGH confidence that no min-duration doc exists; MEDIUM on current model naming (`saaras:v3/v4` in docs vs `saarika:v2` in code — flag: validate the model string still resolves, do not change during this milestone).
- Codebase evidence (HIGH): `server.ts` lines 388-480 (chunking + VAD + hot-reload), 810-831 (SET_TRANSLATION_SOURCE / SET_TTS_SETTINGS), 943-1074 (handleGoLive); `rtmp-streamer.ts` lines 140-206 (tee + filter_complex), 335-358 (pushAudio); `sarvam-pipeline.ts` lines 140-210 (TTS fallback chain), 306-323 (parallel TTS); `src/lib/obs-relay-client.ts` lines 212-222 (PING resync), 380-393 (setters).
- Node-Media-Server multi-play-consumer reliability: **unverifiable today** (search + GitHub issue search returned empty). MEDIUM confidence from training data that N concurrent readers of one stream is historically flaky — one of the two reasons Option B (single ingest read) is recommended over Option A.

## Open Questions / Phase Flags

- **Phase-0 spike (required):** verify `tee` per-output `select='0:v:0,1:a'` routes distinct audio per destination against the real NMS ingest.
- **Phase-0 spike (recommended):** confirm the speaker list against the live Sarvam TTS API (arjun/arvind/amol/amartya absent from docs).
- **Validate** `saarika:v2` model string still resolves (docs now reference `saaras:v3/v4`); not a v1.2 code change, but latency mode's snappy floor depends on STT model behavior.
- **Empirically test** a 1.5s snappy chunk for hallucination with and without the STT `prompt` context.

---
*Architecture research for: Vaani milestone v1.2 (per-language voice+pace, latency-vs-quality mode)*
*Researched: 2026-08-05*
