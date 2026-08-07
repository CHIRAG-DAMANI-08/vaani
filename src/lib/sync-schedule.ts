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
