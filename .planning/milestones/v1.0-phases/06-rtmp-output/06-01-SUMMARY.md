# Summary: Phase 06-01 — RTMP Output Integration

## What was built
End-to-end RTMP streaming relay that takes processed TTS audio from the Sarvam AI pipeline and pushes it to configured RTMP destinations (YouTube, Twitch, etc.) using FFmpeg's tee muxer.

## Key files

### Created
- `src/lib/rtmp-streamer.ts` — FFmpeg process manager with tee muxer for multi-destination RTMP streaming

### Modified
- `server.ts` — Integrated RTMPStreamer into GO_LIVE, STOP_STREAM, and pipeline result handlers
- `src/lib/obs-relay-client.ts` — Added RTMP status subscriptions and event handling
- `src/app/(dashboard)/dashboard/StatusRow.tsx` — Per-channel RTMP status badges

## Architecture

### RTMPStreamer Engine (`rtmp-streamer.ts`)
- Spawns a single FFmpeg process per session using the `tee` muxer
- Input: raw PCM via stdin (s16le, 24kHz, mono — matching Sarvam TTS output)
- Output: AAC-encoded FLV streams to each RTMP URL
- WAV header stripping to extract raw PCM from Sarvam's base64 WAV responses
- Per-channel health monitoring via FFmpeg stderr parsing
- Auto-restart with exponential backoff (max 3 attempts)
- Graceful shutdown (stdin close → SIGTERM → SIGKILL fallback)
- `:onfail=ignore` flag ensures one dead channel doesn't kill others

### Server Integration (`server.ts`)
- `GO_LIVE`: Fetches RTMP configs from MongoDB channels, decrypts stream keys, spawns RTMPStreamer
- Pipeline callback: Pipes each TTS output's `audioBase64` to the streamer after every chunk
- `STOP_STREAM` / OBS disconnect / WS close: All three tear down the FFmpeg process
- `SESSION_SNAPSHOT`: Now includes `rtmp` field with per-channel status
- Graceful degradation: If no RTMP configs exist, operates in "pipeline-only" mode

### Frontend Integration
- `obs-relay-client.ts`: New `subscribeRTMP()` method, handles `RTMP_ERROR` and `RTMP_CHANNEL_ERROR` events
- `StatusRow.tsx`: Channel cards now reflect actual RTMP connection state (live/connecting/error)

## Verification
- [x] TypeScript: 0 errors (`npx tsc --noEmit`)
- [x] RTMPStreamer correctly builds FFmpeg tee arguments from channel configs
- [x] Audio chunks are pushed as raw PCM to FFmpeg stdin
- [x] FFmpeg process is killed on session stop, OBS disconnect, and WS close
- [x] RTMP status propagated to dashboard via SESSION_SNAPSHOT

## Commits
1. `2de55a9` — feat(phase-06): implement RTMP streamer engine and server integration
2. `3bca1cb` — feat(phase-06): wire RTMP status to dashboard UI and relay client

## Self-Check: PASSED
