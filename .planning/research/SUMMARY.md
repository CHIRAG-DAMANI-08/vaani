# Project Research Summary**Project:** Vaani — real-time multilingual audio translation for live streamers**Domain:** Milestone v1.2 — per-language TTS voice + pace, and latency-vs-quality mode (Snappy/Balanced/Studio)
**Researched:**2026-08-05**Confidence:** HIGH (code-derived), MEDIUM (Sarvam API currency / external service behavior)

## Executive SummaryVaani is a real-time multilingual translation platform for live streamers: OBS audio enters via RTMP, is chunked (16kHz PCM), run through Sarvam's STT → Translate → TTS pipeline, and streamed to YouTube/Twitch. Milestone v1.2 adds two user-facing features: per-channel TTS voice + pace (each output language gets its own deliberate voice, with "use global default" fallback) and a latency-vs-quality mode (Snappy/Balanced/Studio) that trades audio chunk size against STT accuracy. The research converges on one clear conclusion: **neither feature requires a single new dependency.** Both are pure application-code wiring on the stack the repo already ships — the Sarvam TTS API already accepts per-request `speaker`/`pace`, and chunk size is already a local constant in `server.ts`.

The recommended approach is three coordinated wiring changes: (1) DB-backed per-channel voice config on the Mongoose `Channel` model, resolved in the pipeline's existing60-second credential cache with a strict precedence chain (channel override > global TTS settings > registry `defaultSpeaker` > `shubh`); (2) an in-memory `SET_LATENCY_MODE` WS message that reuses the exact `SET_TRANSLATION_SOURCE` hot-reload pattern to restart the FFmpeg audio extractor; and (3) a refactor of the RTMP streamer so each output channel carries only its own language's audio.

The dominant risk is not the features themselves but a **latent architectural defect they expose**: today the single FFmpeg `tee` process mixes *every* enabled language into *every* RTMP destination. Per-language voice is meaningless — and the milestone would "bless" a correctness bug — until audio is routed per channel. The recommended fix is **Option B**: one FFmpeg process per active user, N TTS stdin pipes, tee muxer with per-output `select` to route distinct audio per destination. It must be validated with a phase-0 spike before building on it. Secondary risks are operational: shorter chunks multiply Sarvam request rate (~2-3x), the serial queue saturates and converts latency gains into dropped audio, VAD thresholds tuned for3s chunks drift at other sizes, and the pipeline's fixed15s STT timeout caps how large Studio chunks can be.

## Key Findings### Recommended StackNo new dependencies. All milestone work touches files that already exist, with zero version changes (`mongoose9.3.3`, `ffmpeg-static5.3.0`, `ws8.20.0`, Node22, Zod4.3.6 already installed). The Sarvam TTS `pace` clamp in code (0.5–2.0) already matches the documented bulbul:v3 range exactly.

**Core technologies:**
- `sarvam-pipeline.ts` `runPipeline` — accepts a new per-target-language TTS options map (`ttsPerLanguage: Record<shortId, {speaker?, pace?}>`), resolved with fallback to global options — the only application change point for per-channel voice- Mongoose `Channel` model — two new nullable fields (`speaker: String`, `pace: Number`); null = inherit global, zero migration needed- Custom Node server (`server.ts`) — `userLatencyModes` Map + `SET_LATENCY_MODE` WS handler + mode-driven `CHUNK_SIZE` in `startAudioExtraction()`, reusing the existing stop →1s → restart hot-reload pattern- `language-registry.ts` `LANG_BY_BCP47` — bridges the ID mismatch: TTS outputs carry BCP-47 (`hi-IN`), channels are keyed by short id (`hi`); reverse lookup already exists- `rtmp-streamer.ts` — the one file with real change under Option B: N TTS stdins, per-channel push, tee with per-output `select`

**Avoid:** any new npm package; switching to streaming STT (a rearchitecture, not a constant); changing Sarvam model names mid-feature (code sends `saarika:v2`, docs now list `saaras:v3/v4` — validate, don't migrate).

### Expected FeaturesPer-language voice + pace and latency modes are the milestone scope. The research found the per-channel voice select is a genuine differentiator — YouTube auto-dubbing, the closest mass-market product, has no per-language voice selection, and async tools (ElevenLabs Dubbing, Aloud) don't do it live.

**Must have (v1.2, all P1):**
- Channel `speaker` + `pace` fields, persisted via `POST /api/channels` (CSRF-guarded, whitelisted) and returned by GET- Per-channel voice/pace edit UI in the Channels page with an explicit "Use global default" option- Pipeline per-language TTS resolution: channel override > global `userTTSSettings` > registry `defaultSpeaker` > `shubh`; `sourceLang` stays global-only- `SET_LATENCY_MODE` WS message + `userLatencyModes` Map + mode-driven chunk size + FFmpeg hot-reload (in-memory + localStorage + PING re-sync, mirroring `SET_TTS_SETTINGS` — not DB-persisted)
- Settings "Latency & Quality" card:3-option segmented control with the real tradeoff in copy**Should have (v1.2.x):**
- Single speaker registry (`src/lib/tts-speakers.ts`) replacing3 fragmented speaker lists- Live voice preview button (one on-demand TTS call)
- Active mode + measured `avgLatencyMs` displayed side-by-side in `SessionStats.tsx`

**Defer (v2+):**
- Snappy lowering TTS sample rate24000→16000 (a second lever users must reason about)
- Voice cloning / same-voice-across-languages (Sarvam bulbul has no voice preservation — market per-language voice as the feature)
- Per-stream mode override on Session records, cost estimation per mode### Architecture ApproachThe milestone has one architectural prerequisite (per-channel RTMP routing) and two small wiring features, all in-process on the existing single-process architecture. Recommended is **Option B**: keep one `RTMPStreamer` per user, but give the single FFmpeg process N s16le TTS stdin pipes (one per enabled channel), N sidechain-compress mix stages, and tee outputs with per-output stream selection (`select='0:v:0,1:a'`). It beats Option A (N separate streamers) because it keeps one ingest read (Node-Media-Server multi-play-consumer support is historically flaky, unverifiable today), keeps server.ts streamer lifecycle untouched, holds process count flat, and concentrates all risk in the one file that already owns FFmpeg arg-building. The latency mode deliberately keeps the serial pipeline queue + epoch guard **unchanged** — chunk size changes upstream of the queue only.

**Major components:**
1. `server.ts` — chunking/extraction/VAD (mode-driven `CHUNK_SIZE`), WS handler (new `SET_LATENCY_MODE`), credential cache (now carries per-channel TTS configs), `executeChunkPipeline` (builds `ttsPerLanguage`, routes audio by channelId)
2. `sarvam-pipeline.ts` `runPipeline` — STT → Translate(N) → TTS(N), per-target voice resolution, optional reuse of the already-existing (currently unused) STT `prompt` option for short-chunk context3. `rtmp-streamer.ts` — Option B tee refactor: N TTS inputs, per-channel `pushAudio(channelId, base64)`, per-output stream selection4. `Channel` model + `/api/channels` route + Channels UI — per-channel config persistence (speaker/pace stored plaintext — only `rtmpKey` and API keys are secrets)
5. `obs-relay-client.ts` + Settings UI — `setLatencyMode()` facade, localStorage + PING resync### Critical Pitfalls1. **Chunk size does NOT equal latency when the serial queue is saturated.** When per-chunk processing time `L` exceeds chunk duration (the realistic regime), end-to-end latency ≈ `(MAX_QUEUE_SIZE +1) × L` — independent of chunk size — and Snappy just drops audio every chunk. Fix: bound the queue by **seconds** (`MAX_QUEUE_SECONDS ≈15`) instead of chunk count, and surface a drop counter next to `avgLatencyMs` so the tradeoff is visible, not silent.
2. **VAD thresholds are tuned for3s chunks and silently break at other sizes.** `RMS ≥150 && ZCR ≥100` is chunk-duration-dependent: Studio dilutes speech energy → real speech dropped as "silent"; Snappy clips word boundaries. Fix: normalize to RMS/sec and ZCR-rate, re-tune per mode before shipping either mode.
3. **Chunk bounds are set by Sarvam, not preference.** Floor:1s chunks provably hallucinate (documented in `server.ts`), so Snappy must stay ≥1.5–2s. Ceiling: REST STT is "under30s" but the pipeline's fixed `TIMEOUT_MS =15000` AbortController aborts longer Studio chunks, and longer translations approach bulbul:v3's2500-char limit. Fix: define mode constants against these bounds (Snappy1.5–2s, Balanced3s, Studio4–5s) and scale the timeout with mode.
4. **Per-language voice is meaningless until TTS audio is routed per channel** — today every destination hears every language mixed. This is a pre-existing bug the milestone would bless. Fix: explicit scope decision — land Option B routing in the same milestone, or scope voice to transcript/preview and say so in the UI. Never ship config that has no broadcast effect.
5. **The60-second credential cache silently delays mid-stream voice edits**, and global TTS settings live in a different persistence domain (localStorage vs MongoDB). Fix: cache-busting via a per-user `configVersion` bumped by the channels route on POST (reusing the HMR-safe global pattern); optionally persist global TTS to the `User` model so the fallback is device-independent.

## Implications for RoadmapBased on combined research, a four-phase structure is suggested.

### Phase0: Validation Spikes (prerequisite research)
**Rationale:** Three unknowns gate the whole milestone and are cheap to test first: (a) whether FFmpeg's tee muxer `select='0:v:0,1:a'` actually routes distinct audio per output against the real NMS ingest (unverified — Option B's one risky bit), (b) whether the documented bulbul:v3 speaker list is exhaustive (`arjun`/`arvind`/`amartya`/`amol` in the UI/registry are absent from official docs), (c) whether the `saarika:v2` STT model string still resolves (docs now list `saaras:v3/v4`).
**Delivers:** Go/no-go for Option B; authoritative speaker allowlist; confirmed model string.
**Addresses:** De-risks both feature phases.
**Avoids:** Pitfall4 (routing), speaker-validity fallback trap, and building on a stale STT model.
**Research flag:** This is exactly a `/gsd:research-phase` candidate — live API + FFmpeg behavior, cannot be resolved by reading code.

### Phase1: Per-Channel RTMP Audio Routing (Option B)
**Rationale:** Architectural prerequisite. Per-language voice is a correctness bug without it, and it must land before or with Phase2 — anti-pattern1 explicitly forbids shipping voice config that has no broadcast effect.
**Delivers:** Each RTMP destination carries only its own language in its own voice; single FFmpeg process per user with N TTS stdins and per-output tee `select`.
**Uses:** `rtmp-streamer.ts` (only real change), `ffmpeg-static5.3.0`, `LANG_BY_BCP47` for BCP-47 → short id → channelId mapping.
**Avoids:** Pitfall4; also keeps `pushAudio(channelId, base64)` encapsulated in `rtmp-streamer.ts` (anti-pattern5).

### Phase2: Per-Language Voice + Pace**Rationale:** Depends on Phase1 for broadcast value; the data-flow (DB → cache → pipeline → UI) is fully documented and medium complexity. All P1 items per FEATURES.md.
**Delivers:** Channel `speaker`/`pace` fields, `/api/channels` POST/GET wiring, edit UI with "Use global default", pipeline per-target TTS resolution, cache-shape change.
**Uses:** Mongoose `Channel` model (nullable fields, no migration), `getCachedCredentials`60s cache (now carries channel configs), `runPipeline` `ttsPerLanguage`, Zod for `pace` (0.5–2.0) + speaker allowlist validation.
**Avoids:** Pitfall5 (add `configVersion` cache-busting in this phase, not later), silent speaker substitution, encrypting non-secrets.

### Phase3: Latency Mode (Snappy/Balanced/Studio)
**Rationale:** Independent of Phases1-2 (only touches extraction upstream of the queue), but the highest-risk phase — queue saturation, VAD drift, and timeout bounds are all here. Should ship only after mode constants are defined against the empirical bounds from Phase0.
**Delivers:** `SET_LATENCY_MODE` WS message, `userLatencyModes` Map, mode-driven `CHUNK_SIZE` (Snappy ~2s / Balanced3s / Studio ~5s), queue-seconds bound, normalized VAD thresholds, timeout scaling,429 backoff, Settings UI card.
**Uses:** Existing `SET_TRANSLATION_SOURCE` hot-reload pattern (server.ts ~810), `obs-relay-client.ts` setter + PING resync, `sarvam-pipeline.ts` (optional STT `prompt` context).
**Avoids:** Pitfalls1,2,3,6 (queue bound, VAD normalization, chunk bounds + timeout scaling, rate multiplier +429 backoff).
**Research flag:** Empirical work — hallucination rate at1.5s with/without STT `prompt`, and the latency-vs-chunk-size curve under the15s timeout. Use the existing `src/app/api/test-pipeline/route.ts` for verification.

### Phase Ordering Rationale- Phase1 must precede Phase2 (voice is inert without routing); Phases2 and3 are orderable but Phase3's empirical bounds should follow Phase0.
- Grouping matches architectural patterns: Phase1 concentrates risk in `rtmp-streamer.ts`; Phase2 stays in the DB → cache → pipeline data flow (Pattern2); Phase3 stays in the in-memory-Map + hot-reload pattern (Pattern1), leaving the serial queue/epoch logic (Pattern3) untouched.
- Pitfall mapping aligns one-to-one: routing (P4), voice (P5 + speaker validation), latency mode (P1/P2/P3/P6).

### Research FlagsNeeds deeper research during planning:
- **Phase0:** FFmpeg tee per-output `select` against real NMS ingest (unverified); Sarvam speaker-list + model-string validation (live API, not documented exhaustively).
- **Phase3:** Empirical STT accuracy vs chunk size (1.5s floor, Studio ceiling vs15s timeout); Sarvam undocumented rate limits — treat429 behavior as a research item.

Standard patterns (skip research-phase):
- **Phase2:** DB schema evolution + REST + CRUD UI on an existing Mongoose model — well-established patterns, no external unknowns beyond the Phase0 speaker validation.

## Confidence Assessment| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Code-level evidence for every claim in STACK.md; no new deps verified against installed tree. MEDIUM only on Sarvam model-name currency (`saarika:v2` vs docs `saaras:v3/v4`). |
| Features | MEDIUM-HIGH | Sarvam API facts HIGH (official docs). Competitor/UX claims MEDIUM (web sources). Speaker catalog MEDIUM-LOW (UI/registry speakers absent from official v3 list — needs live validation). |
| Architecture | HIGH | All five load-bearing modules read directly. MEDIUM on NMS multi-play reliability and tee `select` syntax (neither verifiable without live testing). |
| Pitfalls | HIGH | Pitfalls1-6 are code-derived with exact line references. MEDIUM on docs-derived claims (model naming, no-min-duration STT, undocumented rate limits). |

**Overall confidence:** HIGH for the shape of the work (no new deps, three wiring changes, one prerequisite refactor); MEDIUM for the external-contract details that Phase0 must validate.

### Gaps to Address- **`saarika:v2` STT model currency:** code works today, docs recommend `saaras:v3/v4`. Validate availability; do NOT migrate mid-milestone. Affects Phase3's Snappy floor assumption.
- **Speaker list validity:** `arjun`/`arvind`/`amartya`/`amol` are absent from the documented bulbul:v3 list; the fallback chain silently substitutes `shubh`. Validate against the live API once (Phase0) or drop to the official list; any speaker works for any language, so no per-language whitelist needed.
- **FFmpeg tee `select` routing:** the linchpin of Option B is unverified against real NMS ingest. Phase0 spike is mandatory; if it fails, fall back to Option A (N streamers) and accept the NMS multi-play risk.
- **Exact mode values:** research is split between1.5s and2s for Snappy and5s vs6s for Studio. The safe band is Snappy1.5–2s (never1s) and Studio4–5s (bounded by the15s timeout /2500-char limit). Pick values after Phase0/3 empirical testing.
- **60s cache invalidation:** no hook exists for the channels route to bust the server-side cache (same process, no path). The `configVersion` approach is recommended; without it, mid-stream edits appear broken.
- **Global TTS persistence split:** global voice is localStorage-only while per-channel voice is DB-backed, making the "global default" device-dependent. Decide whether to persist global TTS on the `User` model in this milestone or accept the split.

## Sources### Primary (HIGH confidence)
- Codebase: `server.ts` (chunking/VAD/queue/cache/hot-reload), `src/lib/sarvam-pipeline.ts` (TTS fallback chain, `TIMEOUT_MS`, per-call speaker/pace), `src/lib/rtmp-streamer.ts` (tee muxer, `pushAudio` no-routing), `src/lib/models/channel.ts`, `src/app/api/channels/route.ts`, `src/lib/language-registry.ts` (`LANG_BY_BCP47`, `defaultSpeaker`), `src/app/(dashboard)/settings/TTSSettingsSection.tsx`, `src/app/(dashboard)/channels/page.tsx`, `src/lib/obs-relay-client.ts`, `src/lib/stream-session.ts` (`avgLatencyMs`)
- Sarvam official docs, TTS convert reference — per-request `speaker`/`pace` (0.5–2.0 for bulbul:v3), no per-language speaker constraint. https://docs.sarvam.ai/api-reference/text-to-speech- Sarvam official docs, STT transcribe reference — file-based (non-streaming), REST "under30 seconds", "works best at16kHz". https://docs.sarvam.ai/api-reference/speech-to-text### Secondary (MEDIUM confidence)
- Sarvam docs model naming (`saaras:v3/v4` current vs `saarika:v2` in code) — validate, don't assume- Third-party Sarvam integration docs — "all voices work across every supported language" (language-agnostic v3 speakers)
- YouTube auto-dubbing help (no per-language voice selection) and Google Research real-time S2ST (~2s delay, voice preservation) — competitor grounding for the differentiator- OBS x264 preset naming — UX precedent for Snappy/Balanced/Studio### Tertiary (LOW confidence)
- Whether `saarika:v2` is still accepted; whether the documented v3 speaker list is exhaustive; practical STT latency-vs-chunk-size curve governing the15s timeout at Studio sizes; Node-Media-Server multi-play-consumer reliability (one reason Option B is recommended over Option A) — all flagged for Phase0 validation---
*Research completed:2026-08-05*
*Ready for roadmap: yes*
