# Phase 07 Research: Optimization & Polish

## Overview
Phase 07 focuses on reducing end-to-end latency, improving the robustness of the audio pipeline, and refining the "Glassmorphism" UI for a premium user experience.

## Key Findings

### 1. Latency Reduction: Binary WebSockets
Currently, audio chunks are sent as Base64 strings over WebSocket.
- **Problem**: Base64 adds ~33% bandwidth overhead and increases CPU usage for encoding/decoding.
- **Solution**: Switch to binary transfers using `ArrayBuffer`.
- **Implementation**: Set `ws.binaryType = "arraybuffer"` on the client and handle `Buffer` objects on the server.

### 2. Latency Reduction: FFmpeg Tuning
FFmpeg can be further tuned for real-time audio.
- **Flags**: Use `-fflags nobuffer`, `-flags low_delay`, and `-probesize 32` to minimize input analysis time.
- **Muxer**: Ensure the `tee` muxer doesn't introduce buffering.

### 3. UI/UX Polish: State Transitions
The transition between "Stopped" and "Live" can be smoother.
- **Skeleton States**: Show skeleton loaders for session stats while the first chunk is being processed.
- **Error Toasts**: Use a more elegant toast system (e.g., `sonner`) for pipeline errors instead of simple text displays.
- **Micro-animations**: Add a "pulsing" effect to the active language icons when audio is being received.

### 4. Robustness: Connection Recovery
WebSocket and OBS connections can be brittle.
- **Heartbeats**: Implement a standard ping/pong with shorter intervals (e.g., 5s) to detect silent drops faster.
- **Auto-Reconnect**: Refine the `obs-relay-client` to handle network switches (e.g., Wi-Fi to 5G) gracefully.

### 5. E2E Testing
Testing the real-time pipeline is complex.
- **Strategy**: Create a "mock audio source" script that pushes a known WAV file through the WebSocket to verify that STT and TTS outputs match expected patterns.

## Implementation Strategy
1. **Optimization Wave**: Binary WebSocket implementation and FFmpeg tuning.
2. **UI Polish Wave**: Transition refinements, animations, and error handling.
3. **Verification Wave**: Latency benchmarks and E2E smoke tests.
