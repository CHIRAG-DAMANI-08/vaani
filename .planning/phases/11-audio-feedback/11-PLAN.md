---
phase: 11
title: "Real-Time Audio Feedback"
goal: "Give users real-time visibility into what the system is hearing, whether VAD is filtering, and buffer state."
status: complete
---

# Phase 11: Real-Time Audio Feedback

## What Changed

### 1. Server-Side Audio Level Broadcasting (server.ts)
- After computing RMS and ZCR for each 3-second chunk, the server now emits an `AUDIO_LEVEL` WebSocket event containing:
  - `rms` — Volume level (0–32768 range, speech typically 200–5000)
  - `zcr` — Zero crossing rate
  - `vadStatus` — `"speech"` | `"silent"` | `"noise"` (why the chunk was accepted/rejected)
  - `bufferPercent` — How full the 3-second buffer is (0–100%)
- This event fires on every chunk, including rejected ones, so the user always sees feedback.

### 2. Relay Client Support (obs-relay-client.ts)
- New `AudioLevel` type exported for frontend components.
- New `subscribeAudioLevel()` method + `audioLevel` getter on `OBSRelayManager`.
- `AUDIO_LEVEL` message handler added to the WebSocket message switch.

### 3. AudioMeter Component (dashboard/AudioMeter.tsx)
- Renders in the sidebar only when streaming is active.
- **Level bar** — Horizontal bar with peak markers at 25/50/75%, green for speech, amber for noise, gray for silent.
- **VAD badge** — Shows 🎤 Speech / 🔇 Silent / 🔊 Noise with color-coded background.
- **RMS counter** — Raw numeric value in mono font for debugging.
- **Buffer progress** — Tiny progress bar showing chunk fill, color-coded (gray < 40%, amber 40–80%, green 80+%).

### 4. Dashboard Integration (DashboardShell.tsx)
- `AudioMeter` imported and placed between the audio source selector and the live status indicator.
- Component auto-hides when not streaming.

## Files Modified
- `server.ts` — AUDIO_LEVEL event emission
- `src/lib/obs-relay-client.ts` — AudioLevel type + subscriber
- `src/app/(dashboard)/dashboard/AudioMeter.tsx` — New component
- `src/app/(dashboard)/DashboardShell.tsx` — Import + render
