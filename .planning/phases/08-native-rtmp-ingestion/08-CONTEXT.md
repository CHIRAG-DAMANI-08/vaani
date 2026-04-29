# Phase 08: Native RTMP Ingestion - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Source:** User request

<domain>
## Phase Boundary

- Setup local RTMP ingest server (e.g., using `node-media-server` or an FFmpeg ingest listener) to act as a destination for OBS Studio.
- Configure Vaani to provide the user with the localhost ingest URL and stream key.
- Extract the audio stream from the incoming RTMP feed to run through the existing Sarvam AI pipeline.
- Re-mux the original video from the ingested RTMP feed with the translated audio streams for multi-destination RTMP output to YouTube/Twitch.
- Remove dependency on browser audio capture API (`MediaRecorder`).
</domain>

<decisions>
## Implementation Decisions

### Ingestion Server
- Use a robust local RTMP ingest solution within the Vaani Node.js app (like `node-media-server`).
- The server will listen on `rtmp://localhost:1935/live`.

### Video / Audio Multiplexing
- Instead of using the browser's microphone, capture the incoming stream's audio programmatically.
- Pass the audio chunks to the STT/Pipeline layer.
- Once TTS is generated, use FFmpeg's `tee` muxer to combine the original incoming video with the translated audio, and output to the user's defined RTMP endpoints.

### UI Changes
- The dashboard needs to show the RTMP ingest URL and Key for the user to paste into OBS Studio's "Custom Stream Server" settings.
- The `Go Live` button might now mean "Waiting for OBS stream..." instead of requesting browser mic permissions.

</decisions>

<canonical_refs>
## Canonical References
- `.planning/codebase/ARCHITECTURE.md` — Current pipeline architecture
- `src/lib/rtmp-streamer.ts` — Existing FFmpeg tee muxer
- `server.ts` — Main WebSocket relay
</canonical_refs>

<specifics>
## Specific Ideas
- The pipeline logic remains the same (audio chunks to STT -> Translate -> TTS).
- The transport layer changes from `browser -> WS -> server` to `OBS -> RTMP -> server`.
</specifics>

<deferred>
## Deferred Ideas
None
</deferred>
