# Roadmap

## Phase 01: Foundation & Auth ✅
- Next.js setup, Clerk integration, Basic layout.

## Phase 02: Key Management ✅
- Sarvam AI API key CRUD with AES-256-GCM encryption.

## Phase 03: OBS Integration ✅
- OBS WebSocket handshake, Credential syncing, Onboarding modal.

## Phase 04: AI Pipeline ✅
- STT -> Translate -> TTS orchestrator using Sarvam REST APIs.

## Phase 05: Live Dashboard ✅
- WebSocket relay for pipeline status, LiveTranscript, SessionStats components.

## Phase 06: RTMP Output ✅ (2026-04-25)
- [x] RTMP streamer engine (FFmpeg tee muxer)
- [x] Server integration (GO_LIVE, pipeline callback, teardown)
- [x] Dashboard RTMP status per channel

## Phase 07: Optimization & Polish ✅ (2026-04-25)
- [x] Binary WebSocket audio transport (~33% bandwidth reduction)
- [x] FFmpeg low-latency flags (-probesize 32, -analyzeduration 0)
- [x] Real-time latency monitoring (rolling average)
- [x] Sonner toast notifications (glassmorphism-styled)
- [x] Pipeline shimmer animations

## Phase 08: Native RTMP Ingestion ✅ (2026-04-25)
- [x] Setup local RTMP ingest server (e.g. Node-Media-Server or FFmpeg listener)
- [x] Configure OBS to stream to local Vaani ingest endpoint
- [x] Extract audio stream for Sarvam AI pipeline processing
- [x] Re-mux original video with translated audio streams for multi-destination output

## Phase 09: Multi-Source Audio ✅ (2026-04-26)
- [x] L/R stereo channel separation (Mic=Right, Desktop=Left)
- [x] Dashboard audio source selector (mic_only / desktop_only / mixed)
- [x] Advanced VAD with Zero-Crossing Rate + RMS thresholding
- [x] FFmpeg sidechain compression for dynamic audio ducking

## Phase 10: Pipeline Reliability & Queue ✅ (2026-04-27)
- [x] Serial processing queue per user (prevent parallel chunk processing)
- [x] Backpressure detection — drop/delay chunks when Sarvam API is slow
- [x] Ordered transcript delivery (sequence numbering for chunks)
- [x] Pipeline rate limiting (max N concurrent API calls per user)
- [x] Graceful FFmpeg filter_complex fallback for mono audio input
- [x] Cache Sarvam API key in-memory per session (stop querying MongoDB every 3s)

## Phase 11: Real-Time Audio Feedback ✅ (2026-04-27)
- [x] Live audio level meter (RMS visualization) on the dashboard
- [x] VAD status indicator ("🎤 Listening" / "🔇 Filtered" / "⏳ Buffering")
- [x] Waveform or volume bar showing server-side audio input health
- [x] WebSocket event for per-chunk RMS + ZCR values from server to client
- [x] Visual 3-second buffer progress indicator

## Phase 12: Session Persistence & History ✅ (2026-04-27)
- [x] MongoDB model for completed sessions (duration, cost, chunks, languages)
- [x] Write session summary to DB on session stop
- [x] Persist transcript lines per session
- [x] Dashboard "Past Sessions" view with date, duration, cost, transcript
- [x] Working "Export Data" button (CSV/JSON download of session + transcripts)
- [x] Cumulative usage stats on dashboard ("47 hours translated this month")

## Phase 13: Onboarding & Preflight ✅ (2026-04-28)
- [x] First-time setup wizard (API key → Channel → OBS → Test → Go Live)
- [x] Go-Live preflight checklist modal (✅ API Key, ✅ OBS, ✅ Channel, ✅ Audio Source)
- [x] Block "Go Live" with clear error if any preflight check fails
- [x] OBS stereo panning guide (visual step-by-step for L/R setup)
- [x] Contextual help tooltips throughout the dashboard

## Phase 14: Test Mode & Voice Preview ✅ (2026-04-28)
- [x] "Test Pipeline" button — type or speak a sentence, hear TTS output
- [x] TTS voice selector (multiple Sarvam speakers: male/female)
- [x] TTS pace/speed control
- [x] Source language lock (override auto-detect for bilingual speakers)
- [x] Audio preview playback in the dashboard (play translated TTS before going live)

## Phase 15: Language Expansion ✅ (2026-04-28)
- [x] Config-driven language registry (remove hardcoded enum)
- [x] Add Bengali (bn), Kannada (kn), Malayalam (ml), Gujarati (gu), Punjabi (pa)
- [x] Dynamic LANG_MAP in sarvam-pipeline.ts from config
- [x] Per-language RTMP routing (different TTS output per channel destination)
- [x] Language auto-detection confidence display

## Phase 16: Deployment & Infrastructure
- [ ] Dockerfile + docker-compose (Node.js + FFmpeg + MongoDB)
- [ ] Worker thread separation (pipeline processing off main event loop)
- [ ] WebSocket reconnection with session recovery on client
- [ ] Structured logging (pino/winston with log levels and correlation IDs)
- [ ] Graceful shutdown handler (clean up FFmpeg processes, notify clients)
- [ ] Health check endpoint (/api/health)
- [ ] Environment-based config validation on startup

## Phase 17: Analytics & Retention
- [ ] Dashboard analytics cards (total hours, languages used, cost breakdown)
- [ ] Session timeline visualization
- [ ] Cost savings calculator ("vs. hiring a human translator")
- [ ] Dark mode toggle
- [ ] Dashboard i18n (Hindi, Tamil UI translations)
- [ ] Keyboard navigation + ARIA labels for accessibility
