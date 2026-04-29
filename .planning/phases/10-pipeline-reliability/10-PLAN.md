---
phase: 10
title: "Pipeline Reliability & Queue"
goal: "Prevent parallel chunk processing, cache credentials, add backpressure, and handle mono audio gracefully."
status: complete
---

# Phase 10: Pipeline Reliability & Queue

## What Changed

### 1. Serial Processing Queue (server.ts)
- Introduced `UserPipelineState` with a per-user queue, sequence counter, and processing lock.
- `processAudioChunk()` is now synchronous — it enqueues and kicks off the drain loop.
- `drainPipelineQueue()` processes chunks one at a time, in order. No parallel API calls.
- Each chunk gets a monotonic `seq` number sent to the client for ordering.

### 2. Backpressure (server.ts)
- `MAX_QUEUE_SIZE = 10` — if the queue backs up (Sarvam is slow), the oldest chunk is dropped.
- Dropped chunks are logged with their sequence number.

### 3. Credential Cache (server.ts)
- `getCachedCredentials()` caches the decrypted API key + enabled languages in memory.
- Cache TTL: 60 seconds. Eliminates ~20 MongoDB queries/minute per streaming user.

### 4. Pipeline State Cleanup (server.ts)
- `clearPipelineState()` called on all three teardown paths:
  - OBS disconnect
  - User clicks Stop
  - WebSocket closes

### 5. Mono Audio Fallback (rtmp-streamer.ts)
- Added `_monoFallback` flag to RTMPStreamer class.
- FFmpeg stderr handler detects `channelsplit` or channel layout errors.
- On detection, sets `_monoFallback = true` and kills the process.
- Close handler restarts FFmpeg with a simple `[1:a]aresample=44100[final_audio]` filter
  that replaces original audio with TTS (no ducking, but doesn't crash).

## Files Modified
- `server.ts` — Pipeline queue, cache, cleanup
- `src/lib/rtmp-streamer.ts` — Mono fallback
