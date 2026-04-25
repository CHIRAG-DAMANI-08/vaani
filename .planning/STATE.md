# Project State

## Current Position
- **Current Phase**: Phase 06: RTMP Output — **COMPLETE**
- **Last Action**: Executed 06-01-PLAN.md — all 3 waves complete.

## Recent Progress
- **Phase 06**: Implemented RTMP output streaming via FFmpeg tee muxer.
  - Created `src/lib/rtmp-streamer.ts` (FFmpeg process manager)
  - Integrated into `server.ts` (GO_LIVE, pipeline callback, teardown)
  - Wired RTMP status to dashboard (`StatusRow`, `obs-relay-client`)
- **Sprint 5**: Finished live pipeline integration (STT -> Translate -> TTS).

## Key Decisions
- **Single FFmpeg process** per session using tee muxer for all destinations (vs. one process per channel).
- **Graceful degradation**: If no RTMP configs exist, system operates in "pipeline-only" mode.
- **Auto-restart**: FFmpeg restarts up to 3 times with exponential backoff on unexpected exits.
- **`:onfail=ignore`**: One dead RTMP channel doesn't kill the entire stream.

## Pending Tasks
- [ ] Production testing with real RTMP endpoints
- [ ] Latency optimization (buffer tuning)
- [ ] Phase 07: Polish & Optimization

## Open Decisions
- Binary audio transfer (ArrayBuffer) vs current Base64 — would reduce bandwidth ~33%.
- Redis-backed session state for horizontal scaling.
