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
