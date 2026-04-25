# Summary: Phase 07-01 — Performance & UI Polish

## What was built
End-to-end latency optimization (binary WebSocket + FFmpeg tuning), real-time latency monitoring on the dashboard, Sonner toast notifications, and shimmer animations for pipeline stages.

## Key files

### Created
- `src/app/VaaniToaster.tsx` — Glassmorphism-styled Sonner toast wrapper

### Modified
- `src/lib/obs-relay-client.ts` — Binary ArrayBuffer audio transfer (replaces Base64)
- `server.ts` — Binary message handler with isBinary detection + backward-compat
- `src/lib/rtmp-streamer.ts` — Added `-probesize 32` and `-analyzeduration 0` for minimal FFmpeg startup
- `src/lib/stream-session.ts` — Rolling average latency tracking (10-chunk window)
- `src/app/(dashboard)/dashboard/SessionStats.tsx` — 5th stat card: real-time "Latency" metric
- `src/app/(dashboard)/DashboardShell.tsx` — Errors now surface via Sonner toasts
- `src/app/(dashboard)/dashboard/PipelineMonitor.tsx` — Shimmer gradient on active stages
- `src/app/globals.css` — Added `slide-right` and `stage-shimmer` keyframes
- `src/app/layout.tsx` — VaaniToaster integrated at root level

## Architecture Changes

### Binary WebSocket Transport
- **Before**: Audio chunks → Base64 encode → JSON `{type:"AUDIO_CHUNK",audio:...}` → JSON parse
- **After**: Audio chunks → `ArrayBuffer` → Binary WebSocket frame → `Buffer` on server
- **Impact**: ~33% bandwidth reduction, eliminated encode/decode CPU overhead

### FFmpeg Low-Latency
- Added `-probesize 32` and `-analyzeduration 0` to skip input analysis
- Combined with existing `-fflags nobuffer -flags low_delay`

### Latency Monitoring
- `stream-session.ts`: Records `result.timings.total` after each pipeline chunk
- Maintains 10-measurement rolling average via `recordLatency()`
- Exposed as `stats.avgLatencyMs` in `SessionSnapshot`

### Sonner Toast Integration
- `VaaniToaster.tsx`: Client component with glassmorphism styling
- Pipeline errors, RTMP errors, and Go Live failures → `toast.error()`
- Removed inline error box from DashboardShell sidebar

## Verification
- [x] TypeScript: 0 errors (`npx tsc --noEmit`)
- [x] Binary WebSocket: Client sends ArrayBuffer, server handles isBinary flag
- [x] Backward compatibility: Legacy JSON AUDIO_CHUNK still supported
- [x] Latency tracking: Rolling average calculated and sent in SESSION_SNAPSHOT
- [x] Sonner: Toaster renders at root, errors trigger toast.error()
- [x] Animations: shimmer gradient on active pipeline stages

## Commits
1. `6f7563f` — feat(phase-07): binary WebSocket, FFmpeg low-latency, latency monitor, Sonner toasts, shimmer animations

## Self-Check: PASSED
