---
wave: 1
depends_on: []
files_modified:
  - package.json
  - server.ts
  - src/lib/rtmp-streamer.ts
  - src/app/(dashboard)/dashboard/DashboardShell.tsx
  - src/lib/stream-session.ts
autonomous: true
---

# Phase 08: Native RTMP Ingestion - Plan

## Objective
Migrate Vaani from a browser-based audio capture system to a native RTMP ingestion server using `node-media-server`. This enables OBS to stream directly to Vaani, allowing Vaani to process the audio, multiplex it with the original video, and restream to target platforms.

## Tasks

<task>
  <read_first>
    - package.json
  </read_first>
  <action>
    Install `node-media-server` dependency.
    Run: `npm install node-media-server`
    Run: `npm install --save-dev @types/node-media-server`
  </action>
  <acceptance_criteria>
    `package.json` contains `node-media-server` in dependencies.
  </acceptance_criteria>
</task>

<task>
  <read_first>
    - server.ts
  </read_first>
  <action>
    Integrate `node-media-server` into `server.ts`.
    1. Import `NodeMediaServer` from `node-media-server`.
    2. Add configuration:
       ```javascript
       const nmsConfig = {
         rtmp: {
           port: 1935,
           chunk_size: 60000,
           gop_cache: true,
           ping: 30,
           ping_timeout: 60
         }
       };
       ```
    3. Instantiate and run `const nms = new NodeMediaServer(nmsConfig); nms.run();` inside the `app.prepare().then()` block.
    4. Listen for RTMP events:
       ```javascript
       nms.on('postPublish', (id, StreamPath, args) => {
         // StreamPath is /live/{userId}
         const userId = StreamPath.split('/').pop();
         if (userId) {
           handleGoLive(userId, null); // Start session
           startAudioExtraction(userId); // Extract audio
         }
       });
       
       nms.on('donePublish', (id, StreamPath, args) => {
         const userId = StreamPath.split('/').pop();
         if (userId) {
           stopAudioExtraction(userId);
           // call sessionManager.stopSession(userId) and clean up
         }
       });
       ```
  </action>
  <acceptance_criteria>
    `server.ts` contains `new NodeMediaServer(` and event listeners for `postPublish` and `donePublish`.
  </acceptance_criteria>
</task>

<task>
  <read_first>
    - server.ts
  </read_first>
  <action>
    Implement `startAudioExtraction(userId: string)` in `server.ts`.
    1. Spawn a child process using `spawn` from `child_process`.
    2. Command: `ffmpeg -i rtmp://localhost:1935/live/${userId} -vn -f s16le -ar 16000 -ac 1 pipe:1`
    3. Attach a `data` listener to the child process `stdout`. Accumulate chunks until a threshold is reached (e.g., 32000 bytes for 1 second of 16kHz 16-bit PCM).
    4. Once threshold is reached, convert the chunk to base64 and call `processAudioChunk(userId, base64Audio, null)`.
    5. Note: `processAudioChunk` expects base64 webm/pcm, modify it slightly if needed or just pass base64 PCM and let Sarvam API handle it (Sarvam handles raw PCM or wav). If needed, construct a WAV header for the PCM data before base64 encoding.
    6. Store the child process in a global map (e.g., `activeAudioExtractors.set(userId, ffmpegProcess)`).
    7. Implement `stopAudioExtraction(userId)` to kill the process.
  </action>
  <acceptance_criteria>
    `server.ts` contains `function startAudioExtraction(userId: string)` and it spawns `ffmpeg` to read from `rtmp://localhost:1935/live/${userId}`.
  </acceptance_criteria>
</task>

<task>
  <read_first>
    - src/lib/rtmp-streamer.ts
    - server.ts
  </read_first>
  <action>
    Update `RTMPStreamer.start()` to accept an `ingestUrl` and multiplex original video.
    1. Modify `RTMPStreamer` constructor or `start` method to accept `ingestUrl: string`.
    2. Change the FFmpeg command in `rtmp-streamer.ts`. Currently, it uses a black screen. Change it to:
       ```javascript
       const ffmpegArgs = [
         "-hide_banner", "-loglevel", "error",
         "-probesize", "32", "-analyzeduration", "0",
         "-i", ingestUrl, // Input 0: Original video+audio from OBS
         "-f", "wav", "-i", "pipe:0", // Input 1: TTS audio from pipeline
         "-c:v", "copy", // Copy original video
         "-c:a", "aac", "-ar", "44100", "-b:a", "128k", // Encode TTS to AAC
         "-map", "0:v:0", // Use video from Input 0
         "-map", "1:a:0", // Use audio from Input 1
         "-f", "tee",
         teeDestinations
       ];
       ```
    3. In `server.ts`, when creating `RTMPStreamer`, pass `rtmp://localhost:1935/live/${userId}` as the `ingestUrl`.
  </action>
  <acceptance_criteria>
    `src/lib/rtmp-streamer.ts` contains `-c:v copy` and `-map 0:v:0` and `-map 1:a:0`.
  </acceptance_criteria>
</task>

<task>
  <read_first>
    - src/app/(dashboard)/dashboard/DashboardShell.tsx
  </read_first>
  <action>
    Update the Dashboard UI to reflect native ingest.
    1. Replace the "Go Live" button logic. It should no longer trigger browser audio capture or send the `GO_LIVE` WebSocket message.
    2. Remove `obsRelay.initRelay()` and `obsRelay.startAudioCapture()`.
    3. Add an informational panel or card to the Dashboard displaying:
       - **Ingest Server URL:** `rtmp://localhost:1935/live`
       - **Stream Key:** `{user.id}` (the clerk user ID)
    4. The UI will automatically transition to "Live" state when the `SESSION_STARTED` WebSocket message is received (which is now triggered by OBS streaming to the local server).
  </action>
  <acceptance_criteria>
    `DashboardShell.tsx` contains `rtmp://localhost:1935/live` and displays the user's clerk ID as the stream key.
  </acceptance_criteria>
</task>
