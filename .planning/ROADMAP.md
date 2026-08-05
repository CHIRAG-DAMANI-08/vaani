# Roadmap: Vaani

## Overview

Vaani is a real-time multilingual translation platform for live streamers: OBS audio enters via RTMP, is chunked (16kHz PCM), run through Sarvam's STT → Translate → TTS pipeline, and streamed to YouTube/Twitch. The roadmap runs from foundation through live streaming to the current milestone — **v1.2**, which gives each language channel its own TTS voice and pace and lets streamers choose a latency/quality mode. The milestone has one architectural prerequisite (per-channel RTMP audio routing) and two wiring features, all on the existing stack with zero new dependencies.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-25)
- ✅ **v1.1 Streaming & Broadcast** — Phases 6-15 (shipped 2026-04-28)
- 🚧 **Deployment & Infrastructure** — Phase 16 (in progress, unrelated to v1.2)
- 🚧 **v1.2 Per-Language Voice & Pace + Latency Mode** — Phases 17-20 (planned)
- 📋 **Planned** — Phase 21 Analytics & Retention (future scope; renumbered from old "Phase 17" placeholder to make room for v1.2)

## Phases

- [x] **Phase 1: Foundation & Auth** - Next.js setup, Clerk integration, basic layout
- [x] **Phase 2: Key Management** - Sarvam AI API key CRUD with AES-256-GCM encryption
- [x] **Phase 3: OBS Integration** - OBS WebSocket handshake, credential syncing, onboarding modal
- [x] **Phase 4: AI Pipeline** - STT -> Translate -> TTS orchestrator using Sarvam REST APIs
- [x] **Phase 5: Live Dashboard** - WebSocket relay, LiveTranscript, SessionStats
- [x] **Phase 6: RTMP Output** - RTMP streamer engine (FFmpeg tee muxer), server integration, per-channel status
- [x] **Phase 7: Optimization & Polish** - Binary WS audio, low-latency FFmpeg flags, latency monitor, toasts
- [x] **Phase 8: Native RTMP Ingestion** - NMS ingest server, audio extraction, multi-destination re-mux
- [x] **Phase 9: Multi-Source Audio** - L/R separation, source selector, VAD, sidechain compression
- [x] **Phase 10: Pipeline Reliability & Queue** - Serial queue, backpressure, ordering, rate limiting
- [x] **Phase 11: Real-Time Audio Feedback** - Audio level meter, VAD status, waveform
- [x] **Phase 12: Session Persistence & History** - Session records, past sessions view, export
- [x] **Phase 13: Onboarding & Preflight** - Setup wizard, preflight checklist, blocking go-live
- [x] **Phase 14: Test Mode & Voice Preview** - Test pipeline, TTS voice selector, pace control, preview
- [x] **Phase 15: Language Expansion** - Config-driven registry, 5 new languages, per-language output
- [ ] **Phase 16: Deployment & Infrastructure** - Docker, worker threads, reconnection, logging (in progress)
- [ ] **Phase 17: Validation Spike** - Go/no-go for FFmpeg per-output routing; speaker + model validation
- [ ] **Phase 18: Per-Channel Audio Routing** - Each RTMP destination carries only its own channel's language
- [ ] **Phase 19: Per-Channel Voice & Pace** - Per-channel TTS voice/pace with "Use global default" fallback
- [ ] **Phase 20: Latency Mode** - Snappy / Balanced / Studio chunk sizing
- [ ] **Phase 21: Analytics & Retention** - Analytics cards, timeline, i18n, accessibility

## Phase Details

### Phase 1: Foundation & Auth ✅
**Status**: Complete
**Shipped**:
- Next.js setup, Clerk integration, Basic layout.

### Phase 2: Key Management ✅
**Status**: Complete
**Shipped**:
- Sarvam AI API key CRUD with AES-256-GCM encryption.

### Phase 3: OBS Integration ✅
**Status**: Complete
**Shipped**:
- OBS WebSocket handshake, Credential syncing, Onboarding modal.

### Phase 4: AI Pipeline ✅
**Status**: Complete
**Shipped**:
- STT -> Translate -> TTS orchestrator using Sarvam REST APIs.

### Phase 5: Live Dashboard ✅
**Status**: Complete
**Shipped**:
- WebSocket relay for pipeline status, LiveTranscript, SessionStats components.

### Phase 6: RTMP Output ✅ (2026-04-25)
**Status**: Complete
**Shipped**:
- RTMP streamer engine (FFmpeg tee muxer)
- Server integration (GO_LIVE, pipeline callback, teardown)
- Dashboard RTMP status per channel

### Phase 7: Optimization & Polish ✅ (2026-04-25)
**Status**: Complete
**Shipped**:
- Binary WebSocket audio transport (~33% bandwidth reduction)
- FFmpeg low-latency flags (-probesize 32, -analyzeduration 0)
- Real-time latency monitoring (rolling average)
- Sonner toast notifications (glassmorphism-styled)
- Pipeline shimmer animations

### Phase 8: Native RTMP Ingestion ✅ (2026-04-25)
**Status**: Complete
**Shipped**:
- Setup local RTMP ingest server (e.g. Node-Media-Server or FFmpeg listener)
- Configure OBS to stream to local Vaani ingest endpoint
- Extract audio stream for Sarvam AI pipeline processing
- Re-mux original video with translated audio streams for multi-destination output

### Phase 9: Multi-Source Audio ✅ (2026-04-26)
**Status**: Complete
**Shipped**:
- L/R stereo channel separation (Mic=Right, Desktop=Left)
- Dashboard audio source selector (mic_only / desktop_only / mixed)
- Advanced VAD with Zero-Crossing Rate + RMS thresholding
- FFmpeg sidechain compression for dynamic audio ducking

### Phase 10: Pipeline Reliability & Queue ✅ (2026-04-27)
**Status**: Complete
**Shipped**:
- Serial processing queue per user (prevent parallel chunk processing)
- Backpressure detection — drop/delay chunks when Sarvam API is slow
- Ordered transcript delivery (sequence numbering for chunks)
- Pipeline rate limiting (max N concurrent API calls per user)
- Graceful FFmpeg filter_complex fallback for mono audio input
- Cache Sarvam API key in-memory per session (stop querying MongoDB every 3s)

### Phase 11: Real-Time Audio Feedback ✅ (2026-04-27)
**Status**: Complete
**Shipped**:
- Live audio level meter (RMS visualization) on the dashboard
- VAD status indicator ("🎤 Listening" / "🔇 Filtered" / "⏳ Buffering")
- Waveform or volume bar showing server-side audio input health
- WebSocket event for per-chunk RMS + ZCR values from server to client
- Visual 3-second buffer progress indicator

### Phase 12: Session Persistence & History ✅ (2026-04-27)
**Status**: Complete
**Shipped**:
- MongoDB model for completed sessions (duration, cost, chunks, languages)
- Write session summary to DB on session stop
- Persist transcript lines per session
- Dashboard "Past Sessions" view with date, duration, cost, transcript
- Working "Export Data" button (CSV/JSON download of session + transcripts)
- Cumulative usage stats on dashboard ("47 hours translated this month")

### Phase 13: Onboarding & Preflight ✅ (2026-04-28)
**Status**: Complete
**Shipped**:
- First-time setup wizard (API key → Channel → OBS → Test → Go Live)
- Go-Live preflight checklist modal (✅ API Key, ✅ OBS, ✅ Channel, ✅ Audio Source)
- Block "Go Live" with clear error if any preflight check fails
- OBS stereo panning guide (visual step-by-step for L/R setup)
- Contextual help tooltips throughout the dashboard

### Phase 14: Test Mode & Voice Preview ✅ (2026-04-28)
**Status**: Complete
**Shipped**:
- "Test Pipeline" button — type or speak a sentence, hear TTS output
- TTS voice selector (multiple Sarvam speakers: male/female)
- TTS pace/speed control
- Source language lock (override auto-detect for bilingual speakers)
- Audio preview playback in the dashboard (play translated TTS before going live)

### Phase 15: Language Expansion ✅ (2026-04-28)
**Status**: Complete
**Shipped**:
- Config-driven language registry (remove hardcoded enum)
- Add Bengali (bn), Kannada (kn), Malayalam (ml), Gujarati (gu), Punjabi (pa)
- Dynamic LANG_MAP in sarvam-pipeline.ts from config
- Per-language RTMP output (different TTS output per channel destination)
- Language auto-detection confidence display

> Note: research found the "per-language RTMP output" above is not true channel isolation — today the single FFmpeg tee mixes every enabled language into every destination. Phase 18 fixes this; it is a pre-existing correctness bug the milestone would otherwise bless.

### Phase 16: Deployment & Infrastructure
**Goal**: Production deployment infrastructure (separate in-progress workstream, unrelated to v1.2)
**Status**: In progress
**Depends on**: Phases 1-15
**Plans**: 6 plans (0 complete)
**Remaining**:
- Dockerfile + docker-compose (Node.js + FFmpeg + MongoDB)
- Worker thread separation (pipeline processing off main event loop)
- WebSocket reconnection with session recovery on client
- Structured logging (pino/winston with log levels and correlation IDs)
- Graceful shutdown handler (clean up FFmpeg processes, notify clients)
- Health check endpoint (/api/health)
- Environment-based config validation on startup

### Phase 17: Validation Spike
**Goal**: De-risk the milestone before any build work: prove FFmpeg tee per-output audio routing against real NMS ingest (go/no-go for Option B), validate the Sarvam speaker allowlist, and confirm the STT model string.
**Depends on**: Nothing (first v1.2 phase)
**Requirements**: None — de-risking/research phase; gates ROUTE-01, ROUTE-02, VOICE-01, LAT-02
**Success Criteria** (what must be TRUE):
  1. A live FFmpeg tee test proves per-output `select='0:v:0,1:a'` routes distinct audio per RTMP destination against a real Node-Media-Server ingest — recorded go/no-go for Option B; if no-go, an Option A (N streamers) decision is made with rationale.
  2. The Sarvam TTS speaker allowlist is validated against the live bulbul:v3 API (are `arjun`/`arvind`/`amartya`/`amol` valid?); any invalid speakers are removed from the registry and the fallback chain, with no silent `shubh` substitution.
  3. STT model string confirmed: `saarika:v2` still resolves on the live API, or a validated replacement is chosen — no mid-milestone migration.
  4. Concrete latency-mode constants are decided against Sarvam bounds: Snappy ≥1.5-2s (never 1s), Balanced 3s, Studio 4-5s (bounded by the 15s pipeline timeout / 2500-char limit) — passed to Phase 20.
**Plans**: 1 plan (research-phase spike)

### Phase 18: Per-Channel Audio Routing
**Goal**: Each RTMP destination carries only its own channel's translated audio — the architectural prerequisite that makes per-language voice meaningful.
**Depends on**: Phase 17 (spike go/no-go gates the Option B build)
**Requirements**: ROUTE-01, ROUTE-02
**Success Criteria** (what must be TRUE):
  1. With 2+ enabled language channels live, each RTMP destination plays only its channel's translated audio — no destination hears a mix of all enabled languages. (ROUTE-01)
  2. Each enabled channel has its own TTS input pipe into the streamer; pushing audio to one channel leaves every other channel's output untouched (per-output stream selection). (ROUTE-02)
  3. Enabling or disabling a channel mid-stream starts/stops that channel's audio on its destination without restarting the session or disturbing other channels.
  4. The streamer stays one FFmpeg process per user (Option B) — server lifecycle and process count unchanged; no regression in start/stop behavior.
**Plans**: 2 plans (TBD)

### Phase 19: Per-Channel Voice & Pace
**Goal**: Each language channel speaks with its own TTS voice and pace, or inherits the global TTS settings when left unset.
**Depends on**: Phase 18 (routing — voice is inert without it); Phase 17 (validated speaker allowlist)
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. User can set a distinct TTS voice per channel in the Channels UI, chosen from the validated speaker allowlist. (VOICE-01)
  2. User can set a distinct TTS pace per channel, validated to the Sarvam range 0.5-2.0. (VOICE-02)
  3. User can leave voice and/or pace unset ("Use global default") and the channel inherits the global TTS settings for that field. (VOICE-03)
  4. Per-channel voice and pace persist in MongoDB and survive session restarts. (VOICE-04)
  5. Changing a channel's voice or pace mid-stream applies to new audio chunks without restarting the session — no 60-second credential-cache delay (config cache-busted). (VOICE-05)
**Plans**: 3 plans (TBD)

### Phase 20: Latency Mode
**Goal**: Streamer chooses a global latency/quality tradeoff — Snappy / Balanced / Studio — mapped to STT chunk size, applying live without restart.
**Depends on**: Phase 17 (mode bounds + model confirmation); independent of Phases 18-19
**Requirements**: LAT-01, LAT-02, LAT-03
**Success Criteria** (what must be TRUE):
  1. User can select a global latency mode — Snappy / Balanced / Studio — in Settings. (LAT-01)
  2. Latency mode drives the STT chunk size: Snappy ~2s, Balanced 3s, Studio 4-5s — the FFmpeg audio extractor chunks at the selected mode's duration. (LAT-02)
  3. Changing latency mode mid-stream applies without restarting the session (reuses the SET_TRANSLATION_SOURCE hot-reload pattern). (LAT-03)
  4. The tradeoff is visible, not silent: active mode and measured avgLatencyMs are shown side-by-side, and a drop counter surfaces queue saturation — no silent audio loss at Snappy (queue bounded by seconds, not chunk count).
  5. Speech stays intelligible at every mode: VAD thresholds normalized for non-3s chunk sizes (no speech dropped as "silent" at Studio, no clipped words at Snappy), and STT timeouts scale with mode (no Studio chunk aborted by the 15s cap).
**Plans**: 3 plans (TBD)

### Phase 21: Analytics & Retention
**Goal**: Dashboard analytics, accessibility, and i18n (future scope — not part of v1.2)
**Depends on**: Phase 20
**Requirements**: None (future milestone)
**Status**: Not started
**Planned**:
- Dashboard analytics cards (total hours, languages used, cost breakdown)
- Session timeline visualization
- Cost savings calculator ("vs. hiring a human translator")
- Dark mode toggle
- Dashboard i18n (Hindi, Tamil UI translations)
- Keyboard navigation + ARIA labels for accessibility

## Progress

**Execution Order:** v1.2 executes 17 → 18 → 19, with 20 orderable any time after 17. Phase 16 (deployment) is a separate in-progress workstream. Phase 21 is future scope.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1-5 (v1.0 MVP) | - | Complete | 2026-04-25 |
| 6-15 (v1.1 Streaming & Broadcast) | - | Complete | 2026-04-28 |
| 16. Deployment & Infrastructure | 0/6 | In progress | - |
| 17. Validation Spike | 0/1 | Not started | - |
| 18. Per-Channel Audio Routing | 0/2 | Not started | - |
| 19. Per-Channel Voice & Pace | 0/3 | Not started | - |
| 20. Latency Mode | 0/3 | Not started | - |
| 21. Analytics & Retention | 0/6 | Not started | - |
