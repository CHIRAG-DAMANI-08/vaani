# Phase 08: Native RTMP Ingestion - Research

## Objective
Research how to implement a native RTMP ingest server in Vaani, decouple from browser audio capture, and mux original video with translated audio for output.

## Key Findings

### 1. Local RTMP Server (`node-media-server`)
- We can embed `node-media-server` directly into our Next.js backend (in `server.ts` or a spawned worker).
- OBS will stream to: `rtmp://localhost:1935/live/{userId}` (using the Clerk userId as the stream key for authentication/routing).
- This receives the h264 video and AAC audio from OBS.

### 2. Audio Extraction for Sarvam Pipeline
- Currently, `server.ts` expects base64 encoded audio from the browser via WebSocket.
- With RTMP ingest, we can spawn a background `ffmpeg` process when the stream connects:
  ```bash
  ffmpeg -i rtmp://localhost:1935/live/{userId} -vn -f s16le -ar 16000 -ac 1 pipe:1
  ```
- This outputs raw 16kHz PCM audio. We can chunk this `stdout` stream (e.g., every 1-2 seconds of bytes) and feed it directly into the Sarvam STT pipeline. (Note: Sarvam STT REST API might expect base64 WAV/PCM. We can wrap the chunks in a WAV header or convert to base64 as needed).

### 3. Video/Audio Multiplexing (`RTMPStreamer`)
- Currently, `RTMPStreamer` receives TTS audio, generates a black video stream, and outputs to RTMP.
- We will update `RTMPStreamer` to pull the original video from the ingest server and combine it with the TTS audio:
  ```bash
  ffmpeg -i rtmp://localhost:1935/live/{userId} -i pipe:0 -c:v copy -map 0:v:0 -map 1:a:0 -c:a aac -f tee "[f=flv]rtmp://yt/hi|[f=flv]rtmp://tw/hi"
  ```
- **Crucial advantage:** `-c:v copy` means we don't re-encode the video. This uses minimal CPU.
- `pipe:0` remains the stdin for the TTS audio buffers.

### 4. UI/UX Changes
- The dashboard needs to display the Ingest URL (`rtmp://localhost:1935/live`) and the Stream Key (`{userId}`).
- The "Go Live" flow: Instead of pressing "Go Live" in the browser and prompting for microphone, the session is triggered automatically when the RTMP ingest server emits a `postPublish` event (stream connected). The dashboard simply reflects the live status.

## Validation Architecture
- **Ingest Validation:** Verify `node-media-server` runs on port 1935 and accepts streams.
- **Extraction Validation:** Verify `ffmpeg` can extract PCM audio from the ingest stream.
- **Muxing Validation:** Verify `RTMPStreamer` successfully copies the video stream (`-c:v copy`) and replaces the audio stream with the TTS output to the destination.
- **Dashboard Validation:** Verify the dashboard shows the correct Ingest URL and Stream Key.

## RESEARCH COMPLETE
