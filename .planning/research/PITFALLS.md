# Pitfalls Research

**Domain:** Real-time audio translation pipeline — adding per-language TTS voice/pace and latency-vs-quality (Snappy/Balanced/Studio) chunk sizing to an existing live-streaming pipeline (Vaani v1.2)
**Researched:** 2026-08-05
**Confidence:** HIGH (code-derived analysis) / MEDIUM (Sarvam docs-derived claims)

## Executive Context (what the code actually does today)

- Chunking: `server.ts` `startAudioExtraction()` — `CHUNK_SIZE = 32000 * 3` (3s of 16 kHz s16le PCM), with an inline comment: *"1 second is too short for Sarvam's saarika model to establish context, leading to aggressive hallucination of random words."* This comment is the single most important constraint on the Snappy mode.
- VAD: computed per raw chunk (RMS ≥ 150 && ZCR ≥ 100 count), `server.ts:426-443`. Thresholds were tuned for 3s chunks.
- Queue: per-user serial queue, `MAX_QUEUE_SIZE = 10` chunks, drop-oldest (`server.ts:169-174`). Backpressure is counted in **chunks**, not seconds.
- TTS config: `userTTSSettings` Map (`server.ts:70`) — GLOBAL per user, in-memory only (persisted client-side in localStorage). Applied uniformly to ALL target languages (`server.ts:269`, `sarvam-pipeline.ts:311`).
- Per-language data that already exists but is **never used**: `src/lib/language-registry.ts` `defaultSpeaker` per language ("bulbul:v3 has per-language optimal speakers"). The current fallback chain skips it.
- Broadcast routing: `executeChunkPipeline` pushes **all** `ttsOutputs` into one `RTMPStreamer` queue (`server.ts:313-320`); `rtmp-streamer.ts` tees **one** mixed input stream to **all** RTMP destinations. There is no per-channel audio routing today.
- Sarvam API (official docs, fetched 2026-08-05): STT models are now `saaras:v3` (default/recommended) and `saaras:v4`; the REST endpoint is for "quick responses under 30 seconds" — longer audio goes to the Batch API. The code sends `model: "saarika:v2"` (`sarvam-pipeline.ts:43`). No numeric rate limits are documented anywhere; HTTP 429 = quota exceeded.

---

## Critical Pitfalls

### Pitfall 1: Smaller chunks do NOT reduce end-to-end latency when the serial queue is saturated — Snappy converts latency into dropped audio

**What goes wrong:**
The dashboard shows an average latency figure (already tracked: `stream-session.ts` `avgLatencyMs`). Users pick "Snappy" expecting lower latency. What actually happens: the per-user serial queue (`drainPipelineQueue`) processes one chunk at a time; each chunk costs `L` seconds (STT + translate×N + TTS×N, realistically 3–10 s). Audio arrives at one chunk every `chunk_duration` seconds. Because `L > chunk_duration` in the realistic regime (and the queue is 10 deep), the queue is **saturated during sustained speech** and continuously drop-oldest. When saturated:

```
end-to-end latency ≈ (MAX_QUEUE_SIZE + 1) × L   — independent of chunk size
```

Halving the chunk size to 1 s gives: queue fills in ~12 s of continuous speech (1 chunk/s in, ~0.17 chunks/s out), then a chunk is dropped **every second**. Net result: Snappy mode delivers no real latency win and silently deletes audio. (3 s → 1 s also triples STT request rate; see Pitfall 6.)

**Why it happens:**
`MAX_QUEUE_SIZE` is a chunk count, so it is unit-inconsistent across modes: 10 chunks = 10 s of audio (Snappy 1 s) vs 50 s (Studio 5 s). The queue/backpressure design assumed a fixed chunk size. Nobody modeled latency as queue-depth × processing-time; the mental model was "smaller chunk → less buffering," which is only true when the queue is near-empty.

**How to avoid:**
- Make backpressure a function of mode: bound the queue by **seconds of audio** (e.g. a constant `MAX_QUEUE_SECONDS ≈ 15`), so `MAX_QUEUE_SIZE = ceil(MAX_QUEUE_SECONDS / chunk_duration)`. This keeps drop behavior equivalent across modes.
- Be explicit in the roadmap: the only real latency levers are (a) reducing `L` (fewer enabled channels, faster model) and (b) reducing queue depth — chunk size is second-order. If Snappy must show a real latency win, also shrink `MAX_QUEUE_SECONDS` for Snappy (accepting more drops).
- Track and surface drops: log a metric when `processAudioChunk` drops a chunk (already logs a warning — make it a counter) and expose it to the dashboard next to `avgLatencyMs`, so the mode's tradeoff is visible instead of silent.

**Warning signs:**
- `avgLatencyMs` barely moves when switching 3 s → 1 s chunks.
- The "Pipeline queue full, dropped chunk" warning (`server.ts:171`) firing in steady-state speech, not just bursts.

**Phase to address:**
Phase: latency-mode implementation (queue rework). Do NOT ship Snappy before the queue is mode-aware.

---

### Pitfall 2: VAD thresholds are tuned for 3 s chunks — Studio (larger chunks) silently drops real speech, Snappy (smaller chunks) clips words

**What goes wrong:**
`isSpeech = rms >= 150 && zeroCrossings >= 100` is computed per chunk. RMS is the mean-square over the whole chunk; ZCR is a **count** over the whole chunk (not a rate). Both are chunk-duration-dependent:
- Larger chunks (Studio 5–6 s): speech energy is diluted by pauses → RMS drops below 150 → real speech classified "silent" → chunk dropped before it ever reaches STT. This is a **quality regression in the "quality" mode**.
- Smaller chunks (Snappy 1–2 s): word onsets/offsets straddle chunk boundaries → boundary clipping, more "noise" classifications, and VAD decisions become jittery chunk-to-chunk.

**Why it happens:**
The thresholds were hand-tuned against 3 s chunks and are hardcoded inside the extractor (`server.ts:426-443`). VAD runs at extraction time, before the queue, so it is the silent gate — a wrong VAD call loses audio with no error surfaced anywhere.

**How to avoid:**
- Normalize the features, not the thresholds: compute RMS-per-second and ZCR-rate (crossings/second), then apply one threshold set per mode (or verify a single normalized threshold holds across 1–6 s).
- Re-tune empirically per mode with real stream audio — this is a Phase activity, not an afterthought. A single loudness/rate check under each mode with known speech+silence material will expose the drift.

**Warning signs:**
- In Studio mode, dashboard VAD indicator shows "silent" during talking (visual check — `AUDIO_LEVEL` messages carry `vadStatus`).
- Transcript gaps where the streamer was clearly speaking.

**Phase to address:**
Phase: latency-mode implementation (VAD normalization is a prerequisite for Studio, not a nice-to-have).

---

### Pitfall 3: The 3 s chunk size is load-bearing for STT quality — the Snappy floor and Studio ceiling are constrained by Sarvam, not by your preferences

**What goes wrong:**
Two hard constraints bracket the mode design:
1. **Floor:** The codebase's own comment (`server.ts:415-417`) documents that 1 s chunks cause aggressive hallucination ("random words") in the Sarvam STT model. "Snappy" must not go to 1 s. A 1.5–2 s floor is the defensible minimum.
2. **Ceiling + timeout:** REST STT is documented as "quick responses under 30 seconds" (longer → Batch API). But the pipeline's `TIMEOUT_MS = 15000` (`sarvam-pipeline.ts:11`) aborts STT/translate/TTS at 15 s via AbortController. Larger Studio chunks take longer to STT — a chunk that pushes total STT time past 15 s aborts and yields an empty transcript. Also: larger chunks → longer translated text → approaching bulbul:v3's 2500-char limit (v2: 1500).

**Why it happens:**
The chunk size is treated as a free tuning knob, but it is coupled to (a) STT model context-window quality on the low end, (b) API request-duration limits and the pipeline's own 15 s timeout on the high end.

**How to avoid:**
- Define modes against these bounds explicitly: e.g. Snappy = 1.5–2 s, Balanced = 3 s (today's value), Studio = 4–5 s (NOT 10 s+).
- Make `TIMEOUT_MS` scale with mode (Studio needs ~30 s), or verify empirically that Studio chunks complete well inside 15 s.
- If Studio grows text near the 2500-char TTS limit, split TTS calls or reject over-long translations.

**Warning signs:**
- "STT request timed out" in logs (`sarvam-pipeline.ts:76`) after enabling Studio.
- Transcript containing repeated short random words (the documented hallucination signature) in Snappy.

**Phase to address:**
Phase: latency-mode implementation (mode constants defined against these bounds + timeout scaling). Verify with the existing `src/app/api/test-pipeline/route.ts` which already exercises STT→translate→TTS per chunk.

---

### Pitfall 4: Per-language voice is meaningless on the broadcast until TTS audio is routed per channel — today every destination receives every language mixed

**What goes wrong:**
`executeChunkPipeline` pushes **all** `ttsOutputs` (one per target language) into the single `RTMPStreamer` audio queue (`server.ts:313-320`), and `rtmp-streamer.ts` tees one mixed input stream to every RTMP destination. So a Hindi channel receives Hindi+Telugu+Bengali… all mixed, regardless of any per-language voice setting. Building per-channel voice/pace config that only changes this one mixed stream is a feature that appears to do something but doesn't — and it is a pre-existing defect the milestone will silently "bless."

**Why it happens:**
`pushAudio(audioBase64)` takes no channel/language parameter (`rtmp-streamer.ts:335`); the routing assumption was "one language per broadcast." The milestone's premise (different voice per language channel) requires per-channel audio routing that does not exist. There is also an ID mismatch to bridge: channels are keyed by `languageId` (`"hi"`), TTS outputs carry the BCP-47 code (`"hi-IN"`) — the registry's `LANG_BY_BCP47` map already exists for this.

**How to avoid:**
- Decide explicitly in the milestone: either (a) implement per-channel audio routing (per-language FFmpeg processes or per-channel tee inputs — the tee muxer and `maxAudioQueueChunks` bound per streamer would need rework), or (b) scope v1.2 voice config to transcript/preview only and state it in the UI.
- If routing is in scope, thread `targetLanguage` (BCP-47) → `channelId` (via `LANG_BY_BCP47`) through `pushAudio` and drop the current all-to-all push.

**Warning signs:**
- After enabling a second language, one destination's audio contains two languages at once (already reproducible today).
- Per-channel voice tests pass against the transcript but the broadcast never changes.

**Phase to address:**
Phase: per-language voice — but this pitfall determines whether voice config is a "looks done" feature. At minimum, flag it in the roadmap as a scope decision before implementation; ideally pair voice config with per-channel routing in the same phase.

---

### Pitfall 5: The 60-second credentials cache silently delays mid-stream per-channel voice changes — and global TTS settings live in a different persistence domain

**What goes wrong:**
`getCachedCredentials` (`server.ts:217-243`) caches the user's enabled languages for `CACHE_TTL_MS = 60_000`. It currently caches only `languages: string[]`; per-channel voice/pace must be added to this cache, which changes its shape. Without an invalidation hook, a streamer who edits a channel's voice mid-stream sees the change take effect up to 60 s later — and if the cache were refreshed, it would only pick up the new config on the 60 s boundary anyway. Separately: global TTS settings (`userTTSSettings`) are in-memory + browser localStorage only (never in DB), while per-channel voice will live in MongoDB. Two different persistence domains mean the "global fallback default" is device-dependent and survives differently.

**Why it happens:**
The 60 s cache was designed to avoid a DB hit on every 3 s chunk — correct instinct. But nothing invalidates it on config change, and the channels API route (`src/app/api/channels/route.ts`) runs in the **same process** as `server.ts` yet has no path to touch the server-side cache. The localStorage persistence of global TTS was a quick win from the original build, not a deliberate durability decision.

**How to avoid:**
- Add a cache-busting mechanism reusing the existing HMR-safe global pattern (`globalAny.activeObsStatus`, `server.ts:65-67`): a per-user `configVersion` (or a timestamp) that the channels route bumps on POST, and that `getCachedCredentials` compares before serving cache.
- Stop/start already reloads config correctly (`clearPipelineState` wipes the cache at session end) — so the lag is only mid-stream; still, users will edit mid-stream.
- Decide where the "global default" lives: recommend persisting global TTS settings on the `User` model so the fallback is stable across devices and survives browser-data clears (TTSSettingsSection's localStorage read can stay as a fast-path, but server should have an authoritative copy).

**Warning signs:**
- User edits a voice mid-stream, sees the old voice for ~a minute, and files it as "settings not saving."
- Different voice defaults on a second device.

**Phase to address:**
Phase: per-language voice (cache shape change + invalidation are part of the data flow, not an add-on).

---

### Pitfall 6: Smaller chunks multiply Sarvam request rate ~3x, and rate limits are undocumented (429 = quota) — the serial queue exists because rate-limit exhaustion was already real

**What goes wrong:**
Requests per chunk = 1 STT + N translate + N TTS (plus up to 4 HTTP attempts per TTS when the speaker fallback chain fires, `sarvam-pipeline.ts:157-162`). At 3 s chunks that is `(1 + 2N)/3` req/s; at 1 s chunks it triples. Sarvam documents **no numeric rate limit** (only HTTP 429 "Quota Exceeded" / `rate_limit_exceeded_error`), so the guardrail has to be self-imposed. The existing serial queue was built precisely because parallel chunk processing caused "Sarvam API rate limit exhaustion" (comment at `server.ts:75-77`) — Snappy re-creates that pressure from the other direction.

**How to avoid:**
- Keep Snappy's floor at 1.5–2 s (not 1 s) to cap the rate multiplier at ~2x, and keep the serial queue.
- Add explicit 429 handling: on `response.status === 429`, back off (don't drop the chunk — hold it for the next drain iteration) instead of letting the current catch-all throw and mark `PIPELINE_ERROR`.
- Consider a per-user request budget/token bucket (there is already a sliding-window engine at `src/lib/rate-limit.ts`) keyed to the mode's request rate.

**Warning signs:**
- `TTS API error 429` / `STT API error 429` lines in logs after enabling Snappy.

**Phase to address:**
Phase: latency-mode implementation (rate-multiplier math + 429 backoff land in the same change that defines chunk sizes).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode VAD thresholds once and share across all chunk sizes | Zero extra tuning work | Studio drops speech (quality regression in the "quality" mode); threshold hunting later | Never — normalize RMS/ZCR per second up front |
| Keep `MAX_QUEUE_SIZE` as a chunk count across modes | No queue changes | Mode-dependent audio loss and inconsistent latency behavior | Only if all modes keep the same chunk size (i.e., don't ship latency modes) |
| Store per-channel speaker/pace in the 60 s cache with no invalidation | Simple cache shape | Mid-stream edits look broken; 60 s of stale voice | Never once the UI exposes mid-stream editing |
| Reuse the existing "kill + respawn FFmpeg" hot-reload for mode changes (the `SET_TRANSLATION_SOURCE` pattern) | One code path | ~1 s audio gap + loss of the partial chunkBuffer on every mode switch | Fine, but accept and document the gap; don't pretend mode switching is gapless |
| Persist global TTS settings only in localStorage | No schema change | Device-dependent defaults; clearing browser data resets voice; server can't know the fallback | Only until per-channel fallback needs to be deterministic — which is exactly this milestone |
| Hand-maintained speaker lists in the UI (TTSSettingsSection `SPEAKERS`) | Simple | Drifts from the actual bulbul:v3 list; silent speaker substitution at runtime | Never once per-language voice is user-facing — source the list server-side |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sarvam STT (`/speech-to-text`) | Assuming any chunk size is safe; code pins `saarika:v2` while docs now recommend `saaras:v3`/`v4` | Verify the STT model version during this milestone (docs changed; code may be stale). Keep chunks ≥ ~1.5 s (hallucination floor) and well under the 30 s REST ceiling; PCM must stay 16 kHz mono (`s16le` + WAV header) |
| Sarvam TTS (`/text-to-speech`) | Treating `pace` as unbounded and `speaker` as valid everywhere | Clamp pace to [0.5, 2.0] for bulbul:v3 (code already does; keep it). Validate per-channel speaker against the real v3 speaker list server-side — the UI list and the language-registry `defaultSpeaker` values (`arjun`, `arvind`, `amartya`, `amol`) do not match the documented v3 list, so the fallback chain silently substitutes `shubh`/`kavya` |
| RTMP output (`rtmp-streamer.ts` tee muxer) | Assuming `pushAudio` routes audio to the right channel | It doesn't — all languages go to all destinations. Per-channel voice requires threading `targetLanguage` (BCP-47) → `channelId` (via `LANG_BY_BCP47`) into `pushAudio`, and reworking the single-tee design |
| Pipeline timeouts (`AbortController`) | Keeping `TIMEOUT_MS = 15000` fixed while Studio grows chunk sizes | Larger chunks take longer to STT; either scale the timeout with mode or bound Studio chunk size so STT completes inside 15 s |
| Channels API (`/api/channels/route.ts`) | Adding `speaker`/`pace` fields only to the UI and DB | Wire them through GET (the merge in `route.ts:25-39` must pass them through `ChannelData`) and POST (validate: pace in [0.5, 2.0], speaker in a server-side allowlist). No encryption needed — these are non-secrets, unlike `rtmpKey` |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Serial pipeline slower than real time (`L > chunk_duration`) | Queue full warnings during sustained speech; `avgLatencyMs` pinned high | Bound queue by seconds, not chunks; make chunk-size mode-aware; keep Snappy ≥ 1.5 s | Already near the edge today (queue of 10 drops under bursts); Snappy at 1 s makes it permanent |
| Request rate scaling with chunk count (STT 1/2N per chunk) | 429 quota errors only after switching modes | Token bucket per user keyed to mode; 429 backoff in `sarvam-pipeline.ts` instead of throw | With Snappy + many enabled channels (N large), the `(1+2N)/s` rate triples |
| Larger chunks → longer STT → 15 s AbortController | "STT request timed out" after enabling Studio | Scale timeout with mode or cap Studio chunk size | Studio beyond ~4–5 s on slow Sarvam STT responses |
| TTS speaker fallback chain up to 4 attempts per language per chunk | Spikes of TTS calls when a per-channel speaker is invalid | Validate speakers against the real v3 list at config-save time (fail loudly in UI, not silently in the pipeline) | Any channel configured with a speaker from the stale UI/registry lists |
| `maxAudioQueueChunks = 200` on the RTMP streamer | Memory ceiling is fine, but audio under-run/stall when TTS bursts don't keep pace | Keep; it is a bound, not a performance issue | N/A — but per-channel routing (if added) must give each channel its own queue, not share one |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Encrypting per-channel speaker/pace as if they were secrets | Unnecessary AES-GCM overhead and decrypt calls in the per-chunk path (the 60 s cache exists to avoid exactly this) | Store speaker/pace in plaintext on the channel doc — only `rtmpKey` and API keys need encryption |
| Failing to validate `speaker`/`pace` in the channels POST body | Arbitrary `pace` values (e.g. 100) sent to Sarvam; garbage speaker names trigger the fallback chain and burn quota | Zod/schema validation: pace in [0.5, 2.0], speaker in server-side allowlist — the same CSRF check already in `route.ts` stays |
| Shipping per-language voice without per-channel routing and claiming it works | Users believe their Hindi channel speaks Hindi in Hindi voice while the tee muxer mixes all languages to all channels | Treat routing as a scope decision with an explicit answer, and surface it in the UI ("what your viewers hear") |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Two places to configure voice (global "Voice & Language" in Settings vs per-channel in Channels) with no "inherit default" affordance | Global changes silently stop applying to channels that were customized; users can't tell which value is winning | Per-channel UI: "Use global default" option; show the effective value (channel → global → per-language registry default → `shubh`) |
| Latency-mode labels ("Snappy") promise latency that the saturated serial queue doesn't deliver | Users perceive a broken feature | Show the real tradeoff in the UI: display `avgLatencyMs` and a drop counter next to the mode picker; set expectations in copy ("lower chunk size, more dropped audio under load") |
| Mid-stream mode switch = ~1 s audio gap (FFmpeg restart) | Viewers hear a gap; streamer thinks it crashed | Confirm in UI ("apply now" vs "next session"), or restrict mode changes to pre-live; show the gap as a status, not an error |
| Global TTS persists in localStorage; per-channel in DB | Voice defaults differ across devices; clearing browser data resets global voice | Persist global TTS to the User model (server authoritative), keep localStorage as a fast-path |
| Pace slider with no per-channel indication of clamp | User sets pace 3.0, Sarvam clamps to 2.0 silently | Clamp in the UI range, and echo the effective value |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Per-channel voice:** Config stored and rendered in the Channels UI, but the broadcast still tees all languages to all channels — voice has no audible effect. Verify: after picking per-channel voices, each RTMP destination carries only its own language in its own voice.
- [ ] **Latency modes:** `CHUNK_SIZE` changed by mode, but VAD thresholds and `MAX_QUEUE_SIZE` left at 3 s tuning — Studio drops speech, Snappy drops chunks. Verify: same source material under all three modes produces comparable transcript coverage and a lower drop counter, not just a different chunk cadence.
- [ ] **Mid-stream edits:** Channel POST returns 200 and the DB updates, but the 60 s cache serves the old voice. Verify: edit a voice while live and observe when the change actually lands (and add an invalidation so it is immediate).
- [ ] **STT model:** Code sends `saarika:v2`; Sarvam docs now recommend `saaras:v3`/`v4`. Verify current model availability before designing around chunk-size quality expectations.
- [ ] **Speaker validity:** Per-language speakers drawn from the UI list / registry defaults that are not in the documented bulbul:v3 speaker list silently fall back to `shubh`. Verify each selectable speaker produces audio (the fallback chain masks this).
- [ ] **Timeout scaling:** Studio chunks STT within the fixed 15 s AbortController window. Verify with the longest configured chunk under the slowest observed response.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Snappy dropping audio (queue saturation) | LOW | Switch to Balanced; lower enabled-channel count (shrinks `L`); queue-seconds bound is the durable fix |
| Studio VAD false-silence dropping speech | LOW | Revert to Balanced; re-tune normalized RMS/ZCR per mode |
| Per-channel voice has no broadcast effect (tee mixing) | HIGH | This is a design/scope gap, not a config bug — requires per-channel routing work or an explicit scope change to transcript-only voice |
| Stale voice for 60 s after mid-stream edit | LOW | Session stop/start already reloads config; add cache invalidation for the no-restart case |
| 429 quota bursts in Snappy | MEDIUM | Back off in the pipeline (hold chunk, retry next drain) instead of throwing; reduce chunk-rate multiplier |
| Invalid per-channel speaker silently falling back | LOW | Validate at save time in `route.ts`; show a warning in the Channels UI |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Queue/latency: chunk size ≠ latency when saturated (P1) | Phase: latency-mode core (mode-aware queue-seconds bound, drop counter) | `avgLatencyMs` and drop counter reported per mode under sustained speech |
| VAD thresholds scale wrong with chunk size (P2) | Phase: latency-mode core (normalize RMS/ZCR per second, re-tune per mode) | VAD indicator never shows "silent" during speech in Studio |
| Chunk bounds: hallucination floor + 15 s timeout + 2500-char TTS ceiling (P3) | Phase: latency-mode core (mode constants defined against bounds, timeout scaling) | `test-pipeline` route exercised at the largest Studio chunk |
| Per-channel voice without per-channel routing (P4) | Phase: per-channel voice — as an explicit scope decision at phase start | Each RTMP destination audibly carries only its own language |
| 60 s cache staleness + persistence split (P5) | Phase: per-channel voice (cache shape + invalidation + global settings to User model) | Mid-stream voice edit applies < ~1 s; defaults identical across devices |
| Request-rate multiplier + undocumented 429 limits (P6) | Phase: latency-mode core (rate budget, 429 backoff) | No 429s after sustained Snappy use |
| Speaker/pace validation + allowlist drift (Pitfall 6 / Integration) | Phase: per-channel voice (server-side allowlist, schema validation) | Every selectable speaker returns audio; invalid choices rejected at save |

---

## Sources

- **Code-derived (HIGH confidence):** `server.ts` (chunking/VAD/queue/cache: lines 70, 95, 158-214, 217-243, 388-480, 824-831); `src/lib/sarvam-pipeline.ts` (model `saarika:v2`, TIMEOUT_MS 15000, TTS fallback chain and pace clamp); `src/lib/rtmp-streamer.ts` (tee muxer, `pushAudio` with no channel routing, `maxAudioQueueChunks`); `src/app/api/channels/route.ts` (upsert, CSRF, encryption of rtmpKey only); `src/lib/models/channel.ts` (schema without speaker/pace); `src/lib/language-registry.ts` (unused `defaultSpeaker` per language, `LANG_BY_BCP47`); `src/app/(dashboard)/settings/TTSSettingsSection.tsx` (localStorage persistence, hand-maintained SPEAKERS list); `src/app/(dashboard)/channels/page.tsx` (ChannelData type); `src/lib/stream-session.ts` (`avgLatencyMs`).
- **Sarvam official docs (MEDIUM confidence, fetched 2026-08-05):** `https://docs.sarvam.ai/api-reference/speech-to-text.md` — `saaras:v3`/`v4` models, "quick responses under 30 seconds" REST ceiling, 16 kHz PCM-only, no numeric rate limits documented. `https://docs.sarvam.ai/api-reference/text-to-speech.md` — bulbul:v3 (37 speakers, pace 0.5–2.0, max 2500 chars), bulbul:v2 (7 speakers, pace 0.3–3.0, max 1500 chars), speaker must match model, default sample rate 24000 Hz.
- **Sarvam docs nav** (redirects / 404s on guessed URLs confirm the `.md`-suffixed structure): `https://docs.sarvam.ai/api-reference/` and `https://docs.sarvam.ai/api-reference/introduction.md`.
- **Unknowns (LOW confidence, needs validation):** whether `saarika:v2` is still accepted (code works today); whether the documented bulbul:v3 speaker list is exhaustive (`arjun`/`arvind`/`amartya`/`amol` are absent from it but used in the UI and registry); the practical STT latency-vs-chunk-size curve that governs the 15 s timeout at Studio sizes.

---
*Pitfalls research for: Vaani v1.2 — per-language voice/pace + latency-vs-quality modes*
*Researched: 2026-08-05*
