# Per-Channel Audio Isolation — Design

## Goal

Each language destination receives **only that language's** translated audio (video + ducked original + that language's TTS), so no viewer hears the wrong language mixed into their stream.

## Context

**The bug:** today one `RTMPStreamer` per user feeds one FFmpeg process with one stdin pipe (`pipe:0`). For every 3s chunk, `server.ts:323-328` pushes **all** languages' TTS outputs into that single pipe. The stereo-ducking filter mixes them into one `final_audio` (`rtmp-streamer.ts:176`), and the tee muxer sends that same mixed track to **every** destination (`rtmp-streamer.ts:221-222`). Result: each viewer hears every enabled language at once.

**Data model fact:** `Channel` has a unique index on `{clerkId, languageId}` — one destination per language per user. So "channel" ≡ "language destination" today.

## Decision (MDMP, COA A)

**One RTMPStreamer per language.** Group the user's channels by `languageId`; start one streamer + one FFmpeg per language, each writing to that language's single RTMP URL. Route each `ttsOutput` to the streamer for its language.

**Rejected:** COA B (single FFmpeg, tee `select` per output) — head-of-line blocking risk (one silent pipe stalls all outputs), and a rewrite of the pump/jitter machinery that's the riskiest code to touch. Revisit only at 6–8+ simultaneous languages on this VM.

## Architecture

### Before
```
OBS → NMS ingest → [one FFmpeg: pipe:0 ← all languages' TTS]
                  → tee → destination A (lang1)  ← hears all languages
                  → destination B (lang2)  ← hears all languages
```

### After
```
OBS → NMS ingest ─┬→ [FFmpeg lang1: pipe:0 ← lang1 TTS] → destination A (lang1)
                   └→ [FFmpeg lang2: pipe:0 ← lang2 TTS] → destination B (lang2)
```

Each FFmpeg keeps the current flags unchanged: video `-c:v copy`, stereo ducking (or mono fallback), AAC, `-fflags nobuffer`, `-flags low_delay`, sample-exact pump, jitter buffer, `setTargetDelay`. NMS already supports N subscribers on one ingest (the audio extractor is one), so N FFmpeg subscribers are proven.

## Data flow

1. `server.ts` start-stream handler (`~line 1010`): group `rtmpConfigs` by `languageId` → `Map<languageId, ChannelRTMPConfig[]>` (1 element each today).
2. For each group, `new RTMPStreamer()` + `.start([config], ingestUrl)`; store under `activeStreamers[userId][languageId]`.
3. `executeChunkPipeline` (`~line 323`): for each `ttsOutput`, resolve `languageId = LANG_BY_BCP47[ttsOutput.targetLanguage]?.id`; look up `activeStreamers[userId][languageId]`; if it exists and is active, `streamer.pushAudio(ttsOutput.audioBase64, captureTime)`.
4. `setTargetDelay(result.timings.total)` is applied to **each** active language streamer (same timing value — pipeline latency is shared).
5. Stop paths (`server.ts:602,780,805,863,915`) iterate all inner streamers.
6. Dashboard status: aggregate each language streamer's `RTMPStreamStatus` into the existing `RTMPStreamerSnapshot.channels` shape.

## Components touched

| File | Change |
|---|---|
| `server.ts` | `activeStreamers` → `Map<userId, Map<languageId, RTMPStreamer>>`; group configs by language; route `ttsOutput`s by language; iterate inner maps on stop; aggregate snapshots. |
| `rtmp-streamer.ts` | **Minimal or none.** Class already accepts a `ChannelRTMPConfig[]`; a single-element array makes the tee a no-op. Confirm no change needed beyond possibly a clearer snapshot aggregation. |
| Channel model / registry | **None.** `LANG_BY_BCP47` already exists in `language-registry.ts`. |

## Error handling

- **A language's TTS fails for a chunk:** that destination plays ducked original with a silent gap for that chunk; other languages keep flowing. (Inherent — only successful `ttsOutput`s are pushed.)
- **A destination fails / is kicked by YouTube:** only that language's FFmpeg errors and restarts (existing `restartAttempts`); others unaffected.
- **Stream end / user disconnects:** all per-language streamers for that user stop.
- **No streamer for a language** (channel disabled mid-stream, or `ttsOutput.targetLanguage` not in `LANG_BY_BCP47`): skip that output silently (log at debug).

## Testing / verification

1. **Unit:** a small script or test verifying BCP-47 → languageId → streamer routing picks the right destination given `ttsOutputs` with mixed `targetLanguage`s.
2. **Local:** run server locally, OBS → ingest, 2 languages configured to 2 test RTMP endpoints; confirm each endpoint receives only its own language (listen + `ffprobe` the two outputs).
3. **VM:** 3 languages on the 1GB box; watch memory (`free -m`) and confirm all three destinations stay isolated over a ~10 min stream.
4. **Failure drill:** kill one destination mid-stream (or block its URL) → confirm the other languages are unaffected and the killed one restarts.
5. **Regression:** single-language stream behaves identically to before (it is the same code path with one streamer).

## Constraints & limits

- Memory: N FFmpeg processes (≈600–750MB at 4 languages on the 1GB VM) — fits; build already stops the server first.
- **Revisit (trigger a re-run of the decision):**
  - 6–8+ simultaneous languages on this VM → COA B becomes the right trade.
  - Lifting the unique index for one language → multiple destinations → revisit per-language vs per-destination processes.
  - Sustained memory pressure during normal streaming (not just builds).

## Out of scope (unchanged behavior)

- The original-language channel is dubbed like any other (no "source audio only" destination).
- Per-language TTS failure produces a silent gap (no re-synthesis retry) — same as today.
- Startup silence (~5–8s) — unchanged.
