# Vaani — Full Project Context
**Date:** April 9, 2026
**Version:** v1.0 (End of Sprint 4)

---

## 1. Project Overview
**Vaani** is a high-performance audio translation and streaming platform. It allows streamers to connect their OBS Studio instance, capture audio, translate it in real-time using Sarvam AI, and broadcast translated audio to multiple localized RTMP channels.

---

## 2. Core Architecture
### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js 22 (Custom server setup)
- **Language**: TypeScript
- **Styling**: Vanilla CSS with a "Floating Glass" design system (Glassmorphism, vibrant gradients, premium aesthetics)
- **Auth**: Clerk (Google OAuth integration)
- **Database**: MongoDB Atlas via Mongoose
- **WebSocket**: Native `ws` server integrated into a custom Node server (`server.ts`) for real-time OBS relay.

### Server Structure (`server.ts`)
We use a custom `server.ts` to support standard Next.js HTTP requests and `wss://` WebSocket connections on the same port.
- **WebSocket Relay**: Authenticates via Clerk session cookies and proxies messages between the browser and the server's internal state.
- **Hot Reloading**: Uses `tsx` with `--env-file` for rapid development.

---

## 3. Implemented Features

### Sprint 3: Sarvam AI Integration
- **API Key Management**: Full CRUD (Create, Read, Update, Delete) for Sarvam API keys.
- **Security**: 
  - **AES-256-GCM Encryption**: Keys are never stored in plaintext. Encrypted using a 64-character hex `ENCRYPTION_KEY`.
  - **Masking**: UI only shows the last 4 characters of the key.
  - **CSRF Protection**: Native CSRF token validation on all mutation endpoints.
  - **Rate Limiting**: Sliding window rate limits (15 min / 10s configurable) to prevent abuse.

### Sprint 4: OBS WebSocket Connection
- **Local Connection**: Uses `obs-websocket-js` on the client to connect directly to `localhost:4455`.
- **Credential Sync**: 
  - Host/Port/Password stored in MongoDB (Password encrypted).
  - Credentials are automatically synced to the client via the WebSocket Relay upon login.
- **Onboarding Flow**: A 3-step modern modal:
  1. Sarvam API Key entry & validation.
  2. OBS Studio setup with live "Test Connection" feedback.
  3. Completion state.
- **Real-time Status**: 
  - Sidebar "Go Live" button is disabled unless both Sarvam and OBS are connected.
  - Interactive status indicator in Settings showing connection health.
  - Dashboard `StatusRow` linked to database configurations.

---

## 4. Key Directory Structure
- `src/app/`: Next.js App Router pages and layouts.
- `src/app/(dashboard)/`: Protected dashboard routes.
- `src/app/api/`: Backend endpoints (Auth, Keys, OBS Status, Channels).
- `src/app/components/`: Reusable UI components (Modal, StatusRow, etc.).
- `src/lib/`: Core logic.
  - `models/`: Mongoose schemas (`User`, `Channel`, `WaitlistEntry`).
  - `obs-relay-client.ts`: Frontend WebSocket management and OBS handshake logic.
  - `rate-limit.ts`: In-memory rate limiting engine.
  - `mongodb.ts`: Database connection singleton.
- `server.ts`: Custom HTTP + WebSocket server entry point.

---

## 5. Security Protocols
- **Credential Storage**: AES-256-GCM with unique IVs and Auth Tags per entry.
- **WS Auth**: WebSocket upgrades are gated by `verifyToken` from `@clerk/backend`, checking the `__session` cookie.
- **Input Sanitization**: Strict Regex validation for Hostnames and IP addresses.

---

## 6. Environment Variables
```bash
# Core
MONGODB_URI=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# Security (Sprint 3/4)
ENCRYPTION_KEY=... # 64-char hex
```

### Sprint 5: Live Pipeline Integration (STT → Translate → TTS)
- **Sarvam Pipeline Engine** (`src/lib/sarvam-pipeline.ts`): Full 3-stage pipeline:
  1. **STT** — `POST /speech-to-text` with `saarika:v2.5` model, auto-detect language
  2. **Translate** — `POST /translate` to all enabled channel languages (parallel)
  3. **TTS** — `POST /text-to-speech` with `bulbul:v3` model (parallel per language)
- **Stream Session Manager** (`src/lib/stream-session.ts`):
  - Per-user session state tracking (stages, transcript, stats, cost estimation)
  - Serializable snapshots pushed to frontend via WebSocket every 1 second
  - Sarvam API cost approximation (STT ₹0.02 + Translate ₹0.005 + TTS ₹0.02 per call)
- **Server Pipeline Orchestration** (`server.ts`):
  - `GO_LIVE` / `STOP_STREAM` WebSocket commands
  - `AUDIO_CHUNK` processing through full Sarvam pipeline with real-time stage updates
  - Auto-stop session on OBS disconnect
  - `SESSION_SNAPSHOT` push every 1s while streaming
- **Audio Capture** (`src/lib/obs-relay-client.ts`):
  - Browser-side `MediaRecorder` capturing system audio (or mic fallback)
  - 3-second audio chunks sent as base64 over WebSocket
  - Subscription-based architecture for all pipeline events
- **Dashboard Components** — All wired to real-time data:
  - `PipelineMonitor` — Live stage transitions (idle → active → done) with timing values
  - `LiveTranscript` — Auto-scrolling transcript buffer from STT results
  - `SessionStats` — Live duration, API cost, chunk count, language count
  - `StatusRow` — Channel cards switch to "Live" with pulsing indicators while streaming
  - `DashboardShell` — Go Live/Stop Stream button, real cost display, error toasts

### Sprint 6: RTMP Output Streaming
- **RTMP Streamer Engine** (`src/lib/rtmp-streamer.ts`):
  - FFmpeg-based audio relay using `tee` muxer for multi-destination RTMP streaming
  - WAV header stripping to extract raw PCM from Sarvam TTS base64 responses
  - Input: s16le PCM, 24kHz, mono → Output: AAC 128kbps, 44.1kHz, stereo FLV
  - Per-channel health monitoring via FFmpeg stderr parsing
  - Auto-restart with exponential backoff (max 3 attempts)
  - `:onfail=ignore` flag ensures one dead channel doesn't kill others
- **Server Integration** (`server.ts`):
  - `GO_LIVE`: Fetches RTMP configs from MongoDB, decrypts stream keys, spawns FFmpeg
  - Pipeline callback: Pipes each TTS output to the streamer after processing
  - Teardown: FFmpeg killed on `STOP_STREAM`, OBS disconnect, and WS close
  - `SESSION_SNAPSHOT` now includes `rtmp` field with per-channel status
  - Graceful degradation: pipeline-only mode when no RTMP configs exist
- **Frontend Integration**:
  - `obs-relay-client.ts`: New `subscribeRTMP()` for real-time RTMP channel status
  - `StatusRow.tsx`: Per-channel RTMP badges (live/connecting/error)

---

## 7. Current Project Status
- **Onboarding**: Functional (Steps 1-3).
- **Settings**: Complete (Sarvam & OBS management).
- **Dashboard**: Fully integrated with live pipeline data.
- **Channels**: CRUD API functional; UI connected to DB.
- **Pipeline**: End-to-end STT → Translate → TTS via Sarvam AI.
- **RTMP Output**: FFmpeg tee-muxer relay to configured RTMP endpoints.

**Next Target (Sprint 7):** Optimization & Polish — latency reduction, UI refinements, E2E tests.
