---
phase: 09
title: "Multi-Source Audio & Pipeline Sync"
goal: "Separate, synchronize, and dynamically mix Mic and Desktop audio sources to prevent overlapping translation and noise hallucinations."
---

# Phase 09: Multi-Source Audio & Pipeline Sync

This phase implements a shippable, low-latency solution to the "watch-party" audio mixing problem. It leverages L/R stereo panning to separate audio sources over a standard RTMP stream, applies Voice Activity Detection (VAD) to prevent hallucinations, and dynamically ducks background audio when the translated TTS plays.

---

## Plan 01: Implement L/R Stereo Separation & Source Control

### Description
Since standard RTMP officially supports only a single audio track, we use L/R stereo panning (Mic = Right, Desktop = Left) as a reliable hack to separate sources. We will add a UI control in the Dashboard so the user can select which source to translate, and update `server.ts` to extract the correct channel.

### Tasks

```xml
<task>
  <description>Update Dashboard UI with Audio Source Selector</description>
  <read_first>
    - src/app/(dashboard)/DashboardShell.tsx
    - src/lib/obs-relay-client.ts
  </read_first>
  <action>
    Add an "Audio Source to Translate" dropdown in `DashboardShell.tsx` (under the Ingest Server Details).
    Options: `mic_only` (Microphone - Default), `desktop_only` (Desktop), `mixed` (Both).
    Update `obs-relay-client.ts` to send this `translationSource` preference to the server via the WebSocket `subscribe` message or a dedicated settings event.
  </action>
  <acceptance_criteria>
    - `DashboardShell.tsx` contains a `<select>` for audio source.
    - Changing the dropdown sends a WebSocket message to the backend.
  </acceptance_criteria>
</task>

<task>
  <description>Modify Audio Extraction in server.ts based on Source Preference</description>
  <read_first>
    - server.ts
  </read_first>
  <action>
    Update the WebSocket handler in `server.ts` to store the `translationSource` preference in the session state.
    Modify `startAudioExtraction(userId, sourcePref)`:
    Change the FFmpeg extraction arguments based on `sourcePref`:
    - `mic_only`: Replace `-ac 1` with `-map_channel 0.1.1` (Extracts Right channel).
    - `desktop_only`: Replace `-ac 1` with `-map_channel 0.1.0` (Extracts Left channel).
    - `mixed`: Use `-ac 1` (Mixes both to mono).
  </action>
  <acceptance_criteria>
    - `server.ts` extracts the specific channel requested by the user's active session state.
  </acceptance_criteria>
</task>
```

---

## Plan 02: Advanced Voice Activity Detection (VAD)

### Description
Enhance the existing basic RMS filter to prevent background music or low hums from triggering aggressive hallucinations in the Sarvam STT pipeline.

### Tasks

```xml
<task>
  <description>Implement Zero-Crossing Rate & Dynamic RMS Thresholding</description>
  <read_first>
    - server.ts
  </read_first>
  <action>
    Enhance the `calculateRMS` loop in `server.ts` (around line 253) to also calculate the Zero-Crossing Rate (ZCR).
    - Speech typically has a specific ZCR range, while pure silence or hums have very low ZCR, and white noise has very high ZCR.
    - Increase the static RMS threshold from `50` to `150`.
    - If `rms < 150`, `continue` (skip STT).
    - Add logic: `let zeroCrossings = 0;` inside the loop, check if the sign of `sample` changes compared to `prevSample`. 
    - If `zeroCrossings` is abnormally low (e.g., < 100 per 3-second chunk), drop it as hum/noise.
  </action>
  <acceptance_criteria>
    - `server.ts` contains `zeroCrossings` calculation inside the chunk loop.
    - Chunks failing RMS or ZCR checks are dropped before hitting the STT pipeline.
  </acceptance_criteria>
</task>
```

---

## Plan 03: Dynamic Ducking and Mixing Layer (RTMP Streamer)

### Description
The most critical part of the watch-party experience. The original speaker's voice (Mic) must be muted in the final output, and the Desktop audio must dynamically lower its volume (ducking) whenever the translated TTS voice plays. All of this is handled purely inside the FFmpeg process inside `rtmp-streamer.ts`.

### Tasks

```xml
<task>
  <description>Implement Sidechain Compression for Audio Ducking</description>
  <read_first>
    - src/lib/rtmp-streamer.ts
  </read_first>
  <action>
    Modify `spawnFFmpeg` in `rtmp-streamer.ts` to use a `filter_complex` instead of direct mapping.
    Remove the basic `-map 0:v:0` and `-map 1:a:0`.
    Add the following complex filter arguments:
    `-filter_complex`
    `[0:a]channelsplit=channel_layout=stereo[desktop][mic];[desktop][1:a]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=1000[ducked_desktop];[ducked_desktop][1:a]amix=inputs=2:duration=first:dropout_transition=2[final_audio]`
    Then map the video and the new audio:
    `-map 0:v:0`
    `-map [final_audio]`
    
    *Fallback strategy:* Because `rtmp-streamer.ts` pushes continuous silence to `pipe:0` when no TTS is active, the `sidechaincompress` will naturally release, returning the Desktop audio to normal volume. If the user doesn't pan audio in OBS, `[desktop]` simply contains the mixed audio, which will still safely duck when TTS plays.
  </action>
  <acceptance_criteria>
    - `src/lib/rtmp-streamer.ts` uses `-filter_complex` with `sidechaincompress` and `amix`.
    - The output stream maps `[final_audio]`.
    - Original microphone audio is successfully removed from the final output, replaced by TTS.
  </acceptance_criteria>
</task>
```

---

## Execution Constraints
- Do NOT rewrite the WebSocket relay; only add the `translationSource` field to the existing payload.
- FFmpeg filters (`sidechaincompress`, `amix`) are heavily order-dependent. Test the filter syntax carefully.
- The `audioQueue` pump in `rtmp-streamer.ts` MUST remain active; otherwise, the `amix` filter will block the entire video muxer.
