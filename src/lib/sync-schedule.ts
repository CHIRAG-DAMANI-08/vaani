/**
 * Pure A/V sync scheduling helpers shared by the RTMP streamer.
 * Dependency-free so the pump/drop/delay policy is unit-testable
 * without FFmpeg or timers.
 */

// 24kHz * 16-bit mono = 48 B/ms
export const BYTES_PER_MS = 48;
// 200ms of output per pump tick — caps bursts after an event-loop stall
export const MAX_TICK_BYTES = 9600;

export function computePumpWrite(
  elapsedMs: number,
  bytesTarget: number
): { bytesToWrite: number; bytesTarget: number } {
  const target = bytesTarget + elapsedMs * BYTES_PER_MS;
  const bytesToWrite = Math.min(Math.floor(target), MAX_TICK_BYTES);
  return { bytesToWrite, bytesTarget: target - bytesToWrite };
}

export const MIN_DELAY_MS = 2000;
export const MAX_DELAY_MS = 8000;

/**
 * Auto-tuned playback delay: clamp the measured latency + 500ms headroom to
 * [MIN_DELAY_MS, MAX_DELAY_MS], then blend 70% current / 30% target so one
 * slow chunk doesn't yank the offset. First call (current === 0) takes the
 * target exactly.
 */
export function smoothDelay(currentMs: number, measuredMs: number): number {
  const target = Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, Math.round(measuredMs) + 500));
  return currentMs === 0 ? target : Math.round(currentMs * 0.7 + target * 0.3);
}
