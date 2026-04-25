# Areas of Concern & Tech Debt

## Architecture
- **Monolithic `server.ts`**: The custom server handles HTTP, WebSocket upgrades, authentication, and pipeline orchestration. This is becoming a "God object" and should be decomposed into smaller handlers.
- **Stateful Server**: Active sessions are tracked in-memory. If the server restarts, all active streams are dropped. Scaling will require a shared state store (e.g., Redis).

## Performance
- **Latency**: The STT -> Translate -> TTS pipeline has inherent latency (processing 3s chunks takes time). Real-time feel is heavily dependent on Sarvam AI response times.
- **Audio Blobs**: 3-second audio chunks are sent as base64 over WebSocket. For high-traffic sessions, this could cause memory pressure or bandwidth issues. Binary transfer (ArrayBuffer) would be more efficient.

## Reliability
- **Error Handling**: While basic try/catch blocks exist, there is no comprehensive retry logic for failed AI pipeline stages (e.g., if TTS fails but STT succeeded).
- **OBS Connection**: Relies on a persistent WebSocket connection from the client. Reconnection logic is implemented but could be made more robust against edge cases.

## Security
- **In-Memory Rate Limiting**: Simple in-memory engine. Will reset on server restart and doesn't scale across multiple instances.
- **Environment Dependency**: Critical functionality (encryption, AI keys) depends on a single `ENCRYPTION_KEY` being correctly set. No backup/rotation strategy.

## Tech Debt
- **Missing Tests**: No unit or E2E tests to prevent regressions in the core pipeline logic.
- **Manual Audio Capture**: The browser `MediaRecorder` setup is complex and relies on specific browser support for system audio capture.
