# System Architecture

## Overview
Vaani is a real-time audio processing and relay platform built on Next.js 16 with a custom Node.js server for stateful WebSocket handling.

## Layers

### 1. Presentation Layer (Next.js)
- **App Router**: Uses server components for data fetching and client components for interactive UI.
- **Design System**: "Floating Glass" design using Tailwind CSS and Framer Motion for high-fidelity aesthetics.
- **State Management**: React state for UI, WebSocket subscriptions for live pipeline data.

### 2. Relay Layer (Custom Node Server)
- **`server.ts`**: The core orchestrator. Handles HTTP (Next.js) and WebSocket upgrades on the same port.
- **WebSocket Relay**: Proxies audio chunks from OBS to the processing pipeline and returns results to the dashboard.
- **Session Manager**: `src/lib/stream-session.ts` maintains the state of active streaming sessions (duration, cost, throughput).

### 3. Processing Pipeline (Sarvam AI)
- **`src/lib/sarvam-pipeline.ts`**: A three-stage engine:
  - **STT**: Converts incoming audio chunks (3s) to text.
  - **Translation**: Translates text to N target languages in parallel.
  - **TTS**: Generates audio for each translation in parallel.

### 4. Data Layer (MongoDB)
- **Mongoose**: Used for schema-based modeling.
- **Encryption**: `src/lib/encryption.ts` provides AES-256-GCM for sensitive data (API keys, OBS passwords).

## Data Flow
1. **Audio In**: OBS -> `MediaRecorder` (Client) -> WebSocket -> `server.ts`
2. **Processing**: `server.ts` -> `runPipeline` (Sarvam AI)
3. **Status Out**: Pipeline -> `SESSION_SNAPSHOT` -> WebSocket -> Dashboard components
4. **Broadcast Out** (Sprint 6 Target): TTS Audio -> RTMP Streamers
