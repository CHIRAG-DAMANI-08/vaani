# Design: TDD-harden the A/V sync logic (Part 1)

**Date:** 2026-08-07
**Status:** Approved by user
**Applies to:** `src/lib/rtmp-streamer.ts`, new `src/lib/sync-schedule.ts`, new test suite

## Context

The jitter-buffer + sample-exact pump shipped in commit `40fbb2a` (A/V timing fix) was
written **tests-after**: a single `tsx` script (`rtmp-sync.selfcheck.ts`) verifies the
`drainDue` policy but never watched a test fail against a missing implementation, and
two pieces of non-trivial logic — the pump's byte accounting and the target-delay
smoothing — have **no coverage at all** because they're inlined in the class.

Goal: move that logic into pure, testable functions and cover it with real
red-green tests (Vitest). Pure refactor — zero behavior change to the live stream.

## Design

### New module `src/lib/sync-schedule.ts`

Pure functions and constants only — no class, no FFmpeg, no IO:

- `BYTES_PER_MS = 48` (24kHz × 16-bit mono = 48 B/ms)
- `MAX_TICK_BYTES = 9600` (200ms pump cap)
- `MIN_DELAY_MS = 2000`, `MAX_DELAY_MS = 8000` (target-delay clamp)
- `DROP_TOLERANCE_MS = 1500` (late-chunk tolerance)

Functions:
- `computePumpWrite(elapsedMs, bytesTarget)` → `{ bytesToWrite, bytesTarget }`
  — accumulates `elapsedMs * 48`, caps at 9600, carries remainder. Replaces the
  inline math in the pump interval.
- `smoothDelay(currentMs, measuredMs)` → blended/clamped delay. First call
  (current = 0) returns the target exactly; otherwise 70/30 blend, clamped to
  `[2000, 8000]`. Replaces the inline math in `setTargetDelay`.
- `drainDue(pending, now, toleranceMs)` → `{ due, dropped }` — **moved** from
  `rtmp-streamer.ts` verbatim, no behavior change.

### `rtmp-streamer.ts`

The class delegates to the module: pump interval calls `computePumpWrite`,
`setTargetDelay` calls `smoothDelay`, `releasePending` calls `drainDue`.
Local `drainDue` definition and inline math removed. Constants imported.

### Tests `src/lib/sync-schedule.test.ts` (Vitest, red → green)

- `computePumpWrite`: 100ms → 4800; 0ms → 0; negative → 0; huge elapsed → capped
  at 9600 with remainder carried; fractional → floored.
- `smoothDelay`: first call → exact target; steady-state → 70/30 blend; clamps at
  2000 and 8000.
- `drainDue`: not-due stays; on-time releases; >1.5s-late dropped; within-tolerance
  plays; multi-chunk ordered release; empty list.

### Deletion

`src/lib/rtmp-sync.selfcheck.ts` — superseded by the Vitest suite. Deleted, not
kept as reference (tests-after artifact).

## Error handling / edge cases covered

Event-loop stall (capped write, no burst), zero/negative elapsed (no negative
writes), first-measurement delay (no warm-up jitter), clamp boundaries.

## Verification

- `npx vitest run` — all green
- `npx tsc --noEmit` — clean
- Live behavior unchanged (pure refactor — identical math, just delegated)

## Not in scope

COA-2 (video-delay hop) and per-channel isolation are separate parts, each with
their own brainstorm → spec → plan cycle.
