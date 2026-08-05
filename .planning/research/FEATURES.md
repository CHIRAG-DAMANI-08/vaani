# Feature Research — Per-Language Voice & Pace + Latency Modes

**Domain:** Real-time multilingual voice translation for live streamers (Vaani v1.2)
**Researched:** 2026-08-05
**Confidence:** HIGH (Sarvam API facts from official docs), MEDIUM (ecosystem/UX patterns from web sources), MEDIUM (speaker-catalog mismatch — needs live API validation)

Scope: research is limited to the two NEW features for milestone v1.2:
1. Per-language voice + pace stored per channel (global TTS settings remain the fallback default)
2. Latency-vs-quality mode (Snappy / Balanced / Studio) that varies audio chunk size sent to Sarvam

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-channel voice selection with a "Use global default" option | A single global voice cannot speak every language naturally; streamers want each output language to sound deliberate. The app already stores a per-language `defaultSpeaker` in `language-registry.ts` (hi→shubh, ta/te/pa→arjun, bn→anushka, kn→arvind, ml→amartya, gu→amol) — users expect to see and override it | MEDIUM | Persisted on the Channel model (`speaker`, `pace` fields). Resolved at pipeline time: channel override > global TTS settings > registry `defaultSpeaker` > hardcoded "shubh" |
| Per-channel pace (speech rate) control | TTS settings already expose pace globally; per-language pace is the same expectation applied per output | LOW | Store `pace` on Channel. Clamp to [0.5, 2.0] (bulbul:v3 range per official docs); note v2 speakers technically allow 0.3–3.0 |
| Latency/quality mode: Snappy / Balanced / Studio | Live-streaming users already understand this tradeoff shape from OBS x264 presets (ultrafast→slow) and Twitch/YouTube latency settings. Users expect a named, one-click tradeoff, not a raw number | MEDIUM | Three preset chunk durations. Sarvam STT is **file-based / non-streaming** (official docs: REST "for quick responses under 30 seconds", "works best at 16kHz") — so chunk duration IS the dominant latency lever |
| Mode is changeable live mid-stream (hot reload) | The app already hot-reloads FFmpeg on `SET_TRANSLATION_SOURCE` (server.ts ~line 810). Users expect the latency mode to apply immediately, not at next GO_LIVE | MEDIUM | Reuse the exact stop → 1s delay → start pattern in `startAudioExtraction()` |
| Live latency feedback so the user sees the tradeoff | Dashboard already renders `snapshot.stats.avgLatencyMs` as "Latency" in `SessionStats.tsx` and records per-stage timings (`timings.stt/translate/tts/total`). Mode should visibly change this number | LOW | No new infra — just surface the mode label next to the existing latency stat |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-language voice in a **real-time** streaming product | YouTube auto-dubbing — the closest mass-market product — has **no per-language voice selection** (official Google help: creators only enable/disable, review, publish per language; voices are auto-selected with "expressive speech" pitch replication). Aloud (pre-acquisition) and ElevenLabs Dubbing do per-language voice assignment but are **async**, not live. Real-time S2ST (Google Research, ~2s delay) preserves the *original* voice instead — the opposite UX. Per-language voice on live output is genuinely unclaimed | MEDIUM | All bulbul:v3 speakers are **language-agnostic** ("all voices work across every supported language" — third-party Sarvam integration docs; official docs list speakers and languages independently, no mapping). So no validity matrix is needed for v3 speakers; the dropdown is global |
| Studio mode doubles STT/TTS context per chunk | 3s→6s gives the STT model ~2× context, directly attacking the documented hallucination problem (server.ts comment: 1s chunks "aggressive hallucination of random words"). Also halves API request count → lower cost + bigger per-chunk time budget | MEDIUM | Studio = 6s chunks. Under load the per-user serial queue (MAX_QUEUE_SIZE=10) drops fewer chunks because pipeline has a 6s budget per chunk vs 3s |
| Snappy as a "live Q&A" preset | Interactive streams (chat-driven) want visible latency under ~1–2s; they accept more STT errors. No live-translation tool ships this as a named preset | MEDIUM | Snappy = 2s chunks. Do NOT go to 1s — the codebase already proved 1s causes hallucination. Also doubles request count vs Balanced (cost + rate-limit pressure) |
| Per-language default voices already exist in the registry | `LANGUAGE_REGISTRY[].defaultSpeaker` is a de-facto per-language voice assignment the product never surfaced. The feature is partly already designed | LOW | When a channel has no override and no global voice is set, use the registry defaultSpeaker instead of hardcoded "shubh" — better output for bn/kn/ml/gu/ta/te/pa out of the box |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Voice preservation / same voice across all languages (voice cloning) | Users hear the pitch-switch per language and want "my voice in every language" | Sarvam bulbul has **no voice-cloning / voice-preservation**; each language has its own voice. This is the Google S2ST pattern (2s delay, research-stage) and a separate product | Explicitly market per-language voice as a feature, not a limitation. "Each language gets its own voice" is the copy, and Studio mode is the quality story |
| In-card live voice preview/audition for every channel | Users want to hear a voice before committing | Previewing requires a live TTS call (cost + latency) on every card render; devolves into a mini-pipeline | One shared "Voices" reference section (or a single preview button that plays a short sample) backed by one TTS call on demand. Defer to v1.2+ |
| Persisting latency mode to the DB (User model) | "My settings should follow me" | Global TTS settings and translation source are NOT persisted today — they live in in-memory Maps + localStorage, re-sent on WS connect (obs-relay-client.ts PING handler). DB-persisting only the mode breaks the established pattern | Keep mode in-memory (`userLatencyModes` Map) + localStorage + re-sync on PING, exactly like `SET_TTS_SETTINGS`. Per-channel voice IS persisted because it is per-channel config |
| A fourth "Ultra" mode under 1.5s | More latency granularity | 1s chunks provably hallucinate on saarika; sub-2s sits on the accuracy cliff | Snappy = 2s floor, documented as "fastest safe chunk size" |
| Mode affecting only one ingest path | Users won't know the browser-capture path ignores it | The browser MediaRecorder binary path in server.ts is effectively **dead code** (obs-relay-client.ts never calls capture/start; audio arrives via OBS→RTMP→FFmpeg extraction). Splitting behavior between paths adds complexity for a path that doesn't run | Control chunk size only in `startAudioExtraction()` (server.ts). If browser capture is ever revived, mirror the same CHUNK_SIZE logic there |

## Feature Dependencies

```
Per-language voice+pace
    └──requires──> Channel model gains `speaker`, `pace` fields (nullable = inherit)
    │                  └──requires──> POST /api/channels accepts + persists them (CSRF-guarded, like rtmpKey/rtmpUrl)
    │                      └──requires──> channels/page.tsx renders voice select + pace slider in edit panel ("Use global" = null)
    └──requires──> getCachedCredentials() (server.ts) returns per-language TTS config, not just languages[]
    │                  └──requires──> cache now stores Map<languageId, {speaker, pace}> refreshed on the same 60s TTL
    └──requires──> executeChunkPipeline() merges: channel override > global userTTSSettings > registry defaultSpeaker
    │                  └──requires──> runPipeline() accepts per-target-language TTS options
    │                      └──requires──> sarvam-pipeline.ts TTS loop looks up {speaker, pace} by target language
    └──enhances──> Single speaker registry (src/lib/tts-speakers.ts) replaces 3 fragmented speaker lists

Latency mode (Snappy/Balanced/Studio)
    └──requires──> NEW WS message SET_LATENCY_MODE + userLatencyModes Map (mirrors SET_TTS_SETTINGS)
    ├──requires──> startAudioExtraction() reads mode → CHUNK_SIZE = 32000 * {snappy:2, balanced:3, studio:6}
    │                  └──requires──> hot-reload FFmpeg on change (existing SET_TRANSLATION_SOURCE stop/1s/start pattern)
    └──requires──> UI control (Settings "Latency & Quality" card, optional dashboard quick-toggle)
    │                  └──requires──> localStorage + re-send on PING (same as TTS settings sync)
    └──conflicts──> NOT persisted to DB (kept in-memory, consistent with SET_TTS_SETTINGS/SET_TRANSLATION_SOURCE)

Per-language voice ──enhances──> Latency mode (Studio's bigger chunks give STT more context, and
                                per-language voice gives each larger output burst its own identity)
```

### Dependency Notes

- **Per-channel voice requires the Channel API to persist new fields:** `POST /api/channels` currently whitelists `languageId/rtmpKey/rtmpUrl/enabled`. `speaker`/`pace` must be added to the body type, the `updateData` merge, and the GET response so `channels/page.tsx` can render saved values. GET must return them (currently returns `enabled/configured/rtmpUrl/hasRtmpKey/updatedAt` only).
- **Per-channel voice requires the pipeline cache to carry TTS configs:** `getCachedCredentials()` returns `{apiKey, languages}` and is the 60s cache. It must also return per-language `{speaker, pace}` from the same `Channel.find({clerkId, enabled:true})` query — one DB fetch, no new query.
- **Per-channel voice requires runPipeline to accept per-target options:** today `runPipeline` forwards one global `speaker/pace` to every `textToSpeech()` call. The TTS loop (`ttsPromises`) iterates `translations` carrying `targetLanguage` = BCP-47 code (e.g. "hi-IN"). New options shape: `ttsByTarget: Record<string, {speaker?, pace?}>` keyed by the same code, built by the caller from channel configs via `LANG_MAP[languageId]`.
- **Latency mode conflicts with a DB-persisted design:** every existing runtime setting is in-memory + localStorage; follow that pattern to avoid a second settings persistence mechanism.

## MVP Definition

### Launch With (v1.2)

- [ ] Channel model `speaker` + `pace` fields (nullable) — nullable means "use global default"; keeps existing documents valid with zero migration
- [ ] `POST /api/channels` accepts/persists `speaker`, `pace`; GET returns them
- [ ] `channels/page.tsx` edit panel: voice `<select>` (all v3 speakers, first option "Use global (Default)") + pace slider, saved via existing `handleSave`
- [ ] `getCachedCredentials()` returns per-language `{speaker, pace}`; `executeChunkPipeline()` merge order: channel > global > registry defaultSpeaker > "shubh"
- [ ] `runPipeline()` per-target TTS options (keyed by BCP-47 code)
- [ ] `SET_LATENCY_MODE` WS message + `userLatencyModes` Map
- [ ] `startAudioExtraction()` computes `CHUNK_SIZE` from mode (Snappy 2s / Balanced 3s / Studio 6s); hot-reload on change
- [ ] Settings "Latency & Quality" card (3-option segmented control + one-line tradeoff per option); localStorage + PING re-sync

### Add After Validation (v1.2.x)

- [ ] Single speaker registry (`src/lib/tts-speakers.ts`) replacing the fragmented UI array + pipeline `BULBUL_V1_SPEAKERS` set + registry defaultSpeaker — trigger: first report of a voice not matching the selected speaker
- [ ] Live voice sample/preview button (one TTS call on demand) — trigger: users ask "what does Arjun sound like?"
- [ ] Surface the active mode + measured avg latency side-by-side in `SessionStats.tsx` — trigger: users can't tell what mode changed

### Future Consideration (v2+)

- [ ] Snappy lowering TTS `sample_rate` 24000→16000 (extra encode/stream speed) — defer; adds a second lever users must reason about
- [ ] Cost estimate per mode (Studio ≈ half the requests of Balanced) — defer; Sarvam billing is per-request and unknowable without a pricing sheet
- [ ] Per-stream mode override remembered on the Session record — defer; nice analytics, not needed to ship

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Channel `speaker`/`pace` fields + API persistence | HIGH | LOW (schema + route whitelist) | P1 |
| channels page per-channel voice/pace edit UI | HIGH | MEDIUM (edit panel already exists) | P1 |
| Pipeline per-language TTS resolution (cache + runPipeline opts) | HIGH | MEDIUM (touches the hot path; keep the 60s cache intact) | P1 |
| SET_LATENCY_MODE + chunk-size presets + hot reload | HIGH | MEDIUM (reuses SET_TRANSLATION_SOURCE pattern) | P1 |
| Settings "Latency & Quality" card + localStorage sync | HIGH | LOW | P1 |
| Speaker registry consolidation | MEDIUM | LOW | P2 |
| Live latency-vs-mode display | MEDIUM | LOW | P2 |
| Voice preview samples | MEDIUM | LOW | P3 |
| TTS sample-rate lever in Snappy | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for v1.2
- P2: Should have in v1.2 if time allows
- P3: Defer

## Competitor Feature Analysis

| Feature | YouTube Auto-dubbing | ElevenLabs Dubbing / Aloud | Real-time S2ST (Google Research) | Live translation apps (LiveLingo, Transync, etc.) | Our Approach |
|---------|----------------------|----------------------------|----------------------------------|--------------------------------------------------|--------------|
| Per-language voice selection | NO (auto voices, "expressive speech" replicates pitch) | YES (per-target voice assignment) — but async | NO (preserves original speaker) | NO | YES, live — per-channel voice override + "Use global" |
| Latency/quality mode | NO (async, processed on upload) | NO (async) | ~2s target, no user control | No named modes; marketing claims only | Snappy/Balanced/Studio chunk presets, hot-swappable |
| Tradeoff transparency | NO (opaque) | NO | NO | NO | Named presets + measured latency displayed live |
| Voice validity guardrails | N/A (auto) | Voice clone per language (own models) | N/A | N/A | All v3 speakers are language-agnostic; legacy 8-speaker list needs validation |

## Sources

- **Sarvam TTS API (official docs)** — `https://docs.sarvam.ai/api-reference/text-to-speech/convert`: bulbul:v3 30+ voices (shubh default), pace 0.5–2.0 default 1.0, sample rates 8000–48000, max 2500 chars; bulbul:v2 female (anushka, manisha, vidya, arya) / male (abhilash, karun, hitesh), pace 0.3–3.0, max 1500 chars. HIGH confidence.
- **Sarvam STT API (official docs)** — `https://docs.sarvam.ai/api-reference/speech-to-text/transcribe`: file-based (non-streaming) multipart POST, "quick responses under 30 seconds" via REST, "works best at 16kHz", 16kHz mono WAV supported. HIGH confidence.
- **Sarvam voices, language-agnostic speakers** — third-party Sarvam integration docs (SLNG/callmissed via search): "all voices work across every supported language"; official docs list speakers and languages independently (no mapping table). MEDIUM confidence.
- **YouTube auto-dubbing (official help)** — `https://support.google.com/youtube/answer/15569972`: auto-generated dubs, no per-language creator voice selection, expressive speech for a subset of languages, async generation, no latency control. HIGH confidence.
- **Google Research real-time S2ST** — `https://research.google/blog/real-time-speech-to-speech-translation/`: end-to-end, original-speaker voice preservation, ~2s delay (research stage). MEDIUM confidence.
- **OBS x264 CPU presets** — OBS blog/forum via search: ultrafast→placebo tradeoff naming; low-latency guides recommend superfast/veryfast/fast. HIGH confidence for the naming convention, used to ground the Snappy/Balanced/Studio UX precedent.
- **Aloud / Creator dubbing per-language voice workflow** — product knowledge (Aloud was acquired by YouTube; per-language voice assignment existed pre-acquisition). LOW-MEDIUM confidence, flag for validation if the roadmap leans on it.
- **Codebase evidence (HIGH confidence, primary):** `server.ts` CHUNK_SIZE=3s + hallucination comment, `language-registry.ts` defaultSpeaker per language, `sarvam-pipeline.ts` BULBUL_V1_SPEAKERS + fallback chain + model string "saarika:v2", `TTSSettingsSection.tsx` 8-speaker list, `channels/route.ts` field whitelist.

---
*Feature research for: Vaani v1.2 — per-language voice & pace + latency modes*
*Researched: 2026-08-05*
