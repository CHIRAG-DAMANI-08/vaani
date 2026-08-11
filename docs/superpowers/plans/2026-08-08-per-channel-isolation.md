# Per-Channel Audio Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each language destination receives only that language's translated audio (video + ducked original + that language's TTS), by running one RTMPStreamer/FFmpeg per language instead of one mixed tee for all.

**Architecture:** `server.ts`'s single `activeStreamers: Map<userId, RTMPStreamer>` becomes `Map<userId, Map<languageId, RTMPStreamer>>`. `handleGoLive` groups the user's channel RTMP configs by `languageId` and starts one streamer per group. `executeChunkPipeline` routes each chunk's TTS outputs to the streamer for their resolved language. Pure routing/snapshot helpers live in a new dependency-free module `src/lib/channel-routing.ts` so they're unit-testable without FFmpeg or timers.

**Tech Stack:** TypeScript, Node/`server.ts` (tsx), FFmpeg (via `ffmpeg-static`), vitest (existing, tests in `src/lib/*.test.ts`).

## Global Constraints

- No new dependencies. Test framework is vitest; tests live beside source as `src/lib/*.test.ts`.
- `src/lib/rtmp-streamer.ts` class API is **unchanged** — it already accepts `ChannelRTMPConfig[]` and its tee handles a single-element array. Do not modify it.
- All current FFmpeg behavior must be preserved verbatim: `-c:v copy`, stereo ducking / mono fallback, `-fflags nobuffer`, `-flags low_delay`, sample-exact pump, jitter buffer, `setTargetDelay`.
- No frontend changes. Dashboard already reads `rtmp.channels[].languageId` per channel status.
- `server.ts` uses relative imports (`./src/lib/...`), not `@/` aliases.
- Language id → BCP-47 mapping is `LANG_MAP`; reverse lookup is `LANG_BY_BCP47` (both already in `src/lib/language-registry.ts`).
- Every task ends green on: `npx vitest run`, `npx tsc --noEmit`, and `npm run build`.

---

### Task 1: Routing helpers (pure, TDD)

**Files:**
- Create: `src/lib/channel-routing.ts`
- Test: `src/lib/channel-routing.test.ts`

**Interfaces:**
- Consumes: `LANG_BY_BCP47` from `./language-registry`; `RTMPStreamerSnapshot` type from `./rtmp-streamer` (type-only import).
- Produces:
  - `type TTSOutputForRouting = { audioBase64: string; targetLanguage: string }`
  - `function resolveLanguageId(targetLanguageBcp47: string): string | null`
  - `function groupTTSPayloadsByLanguage(ttsOutputs: TTSOutputForRouting[]): Map<string, TTSOutputForRouting[]>`
  - `function mergeSnapshots(snapshots: RTMPStreamerSnapshot[]): RTMPStreamerSnapshot`

- [ ] **Step 1: Write the failing test for `resolveLanguageId`**

`src/lib/channel-routing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveLanguageId, groupTTSPayloadsByLanguage, mergeSnapshots } from "./channel-routing";

describe("resolveLanguageId", () => {
  it("maps a BCP-47 tag to its short id", () => {
    expect(resolveLanguageId("ta-IN")).toBe("ta");
    expect(resolveLanguageId("hi-IN")).toBe("hi");
  });

  it("returns null for a tag outside the registry", () => {
    expect(resolveLanguageId("xx-XX")).toBeNull();
    expect(resolveLanguageId("en-IN")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/channel-routing.test.ts`
Expected: FAIL — `Cannot find module './channel-routing'`

- [ ] **Step 3: Write minimal implementation**

`src/lib/channel-routing.ts`:
```ts
/**
 * Pure helpers for routing TTS output to the correct per-language streamer.
 * Dependency-free (only the language registry) so routing is unit-testable
 * without FFmpeg, WebSockets, or timers.
 */
import { LANG_BY_BCP47 } from "./language-registry";
import type { RTMPStreamerSnapshot } from "./rtmp-streamer";

/** The subset of TTS output the router needs. */
export type TTSOutputForRouting = {
  audioBase64: string;
  targetLanguage: string; // BCP-47, e.g. "ta-IN"
};

/**
 * Resolve a Sarvam BCP-47 target tag (e.g. "ta-IN") to the short language id
 * used as the per-language streamer key (e.g. "ta"). Returns null for tags
 * outside the registry (e.g. a language the user disabled mid-stream).
 */
export function resolveLanguageId(targetLanguageBcp47: string): string | null {
  return LANG_BY_BCP47[targetLanguageBcp47]?.id ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/channel-routing.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `groupTTSPayloadsByLanguage`**

Append to `src/lib/channel-routing.test.ts`:
```ts
describe("groupTTSPayloadsByLanguage", () => {
  it("groups outputs by resolved language id, preserving order", () => {
    const grouped = groupTTSPayloadsByLanguage([
      { audioBase64: "A", targetLanguage: "ta-IN" },
      { audioBase64: "B", targetLanguage: "hi-IN" },
      { audioBase64: "C", targetLanguage: "ta-IN" },
    ]);
    expect(grouped.get("ta")?.map((o) => o.audioBase64)).toEqual(["A", "C"]);
    expect(grouped.get("hi")?.map((o) => o.audioBase64)).toEqual(["B"]);
  });

  it("drops outputs with an unknown target language", () => {
    const grouped = groupTTSPayloadsByLanguage([
      { audioBase64: "A", targetLanguage: "ta-IN" },
      { audioBase64: "B", targetLanguage: "xx-XX" },
    ]);
    expect(grouped.get("ta")?.map((o) => o.audioBase64)).toEqual(["A"]);
    expect(grouped.size).toBe(1);
  });

  it("drops outputs with empty audio", () => {
    expect(groupTTSPayloadsByLanguage([{ audioBase64: "", targetLanguage: "ta-IN" }]).size).toBe(0);
  });

  it("returns an empty map for no outputs", () => {
    expect(groupTTSPayloadsByLanguage([]).size).toBe(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/lib/channel-routing.test.ts`
Expected: FAIL — `groupTTSPayloadsByLanguage is not a function`

- [ ] **Step 7: Implement it**

Append to `src/lib/channel-routing.ts`:
```ts
/**
 * Group a chunk's TTS outputs by their resolved language id, dropping any
 * output whose BCP-47 tag is unknown or whose audio is empty. The pipeline
 * emits at most one output per language per chunk, so each value array is
 * normally length 1.
 */
export function groupTTSPayloadsByLanguage(
  ttsOutputs: TTSOutputForRouting[]
): Map<string, TTSOutputForRouting[]> {
  const grouped = new Map<string, TTSOutputForRouting[]>();
  for (const output of ttsOutputs) {
    if (!output.audioBase64) continue;
    const languageId = resolveLanguageId(output.targetLanguage);
    if (!languageId) continue;
    const group = grouped.get(languageId);
    if (group) group.push(output);
    else grouped.set(languageId, [output]);
  }
  return grouped;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/lib/channel-routing.test.ts`
Expected: PASS (6 tests total)

- [ ] **Step 9: Write the failing test for `mergeSnapshots`**

Append to `src/lib/channel-routing.test.ts`:
```ts
describe("mergeSnapshots", () => {
  it("concatenates channel statuses from all snapshots", () => {
    const merged = mergeSnapshots([
      { active: true, channels: [{ channelId: "c1", languageId: "hi", status: "live" }] },
      { active: true, channels: [{ channelId: "c2", languageId: "ta", status: "connecting" }] },
    ]);
    expect(merged.channels.map((c) => c.channelId)).toEqual(["c1", "c2"]);
    expect(merged.active).toBe(true);
  });

  it("is inactive when no streamer is active", () => {
    const merged = mergeSnapshots([
      { active: false, channels: [] },
      { active: false, channels: [] },
    ]);
    expect(merged.active).toBe(false);
    expect(merged.channels).toEqual([]);
  });

  it("is active when at least one streamer is active", () => {
    expect(mergeSnapshots([{ active: false, channels: [] }, { active: true, channels: [] }]).active).toBe(true);
  });
});
```

- [ ] **Step 10: Run it to verify it fails**

Run: `npx vitest run src/lib/channel-routing.test.ts`
Expected: FAIL — `mergeSnapshots is not a function`

- [ ] **Step 11: Implement it**

Append to `src/lib/channel-routing.ts`:
```ts
/**
 * Merge per-language streamer snapshots into the single snapshot shape the
 * dashboard consumes. Active if any language streamer is active; channels are
 * the concatenation of every language's channel statuses.
 */
export function mergeSnapshots(snapshots: RTMPStreamerSnapshot[]): RTMPStreamerSnapshot {
  return {
    active: snapshots.some((s) => s.active),
    channels: snapshots.flatMap((s) => s.channels),
  };
}
```

- [ ] **Step 12: Run the full suite to verify everything passes**

Run: `npx vitest run`
Expected: PASS — all new tests + existing `sync-schedule.test.ts` and `waitlist-policy.test.ts` pass.

- [ ] **Step 13: Commit**

```bash
git add src/lib/channel-routing.ts src/lib/channel-routing.test.ts
git commit -m "feat(stream): pure per-language TTS routing and snapshot helpers"
```

---

### Task 2: Wire per-language streamers in server.ts

**Files:**
- Modify: `server.ts:12` (import), `server.ts:61` (map type), `server.ts:314-330` (push loop), `server.ts:359-364` (snapshot), `server.ts:600-603` (stop path), `server.ts:708-713` (snapshot), `server.ts:740-745` (snapshot), `server.ts:778-781` (stop path), `server.ts:803-806` (stop path), `server.ts:861-864` (stop path), `server.ts:893-897` (stale cleanup), `server.ts:913-916` (shutdown), `server.ts:966-970` (go-live restart check), `server.ts:1006-1069` (streamer start), `server.ts:1074-1080` (SESSION_STARTED snapshot)

**Interfaces:**
- Consumes: `groupTTSPayloadsByLanguage`, `mergeSnapshots` from `./src/lib/channel-routing` (Task 1).
- Produces: nested `activeStreamers` map + `stopStreamersForUser(userId)` and `getStreamersSnapshot(userId)` helpers consumed by all call sites in this task.

- [ ] **Step 1: Add the import**

`server.ts` line 12, after the existing rtmp-streamer import:
```ts
import { RTMPStreamer, type ChannelRTMPConfig, type RTMPStreamerSnapshot } from "./src/lib/rtmp-streamer";
import { groupTTSPayloadsByLanguage, mergeSnapshots } from "./src/lib/channel-routing";
```

- [ ] **Step 2: Change the map type**

`server.ts` line 61:
```ts
// before
const activeStreamers = new Map<string, RTMPStreamer>();
// after
const activeStreamers = new Map<string, Map<string, RTMPStreamer>>();
```

- [ ] **Step 3: Add the lifecycle helpers**

Insert immediately after the `sendToClient` function (ends at `server.ts:371`):
```ts
// ── Per-language RTMP streamer helpers ─────────────────────────────────────
// One RTMPStreamer (one FFmpeg) per language so each destination receives
// only its own language's audio. These helpers keep the nested-map wiring in
// one place.

/** Stop every per-language streamer for a user and drop the user's entry. */
function stopStreamersForUser(userId: string): void {
  const languageStreamers = activeStreamers.get(userId);
  if (languageStreamers) {
    for (const streamer of languageStreamers.values()) {
      streamer.stop();
    }
  }
  activeStreamers.delete(userId);
}

/** Aggregate every language streamer's snapshot into the dashboard shape. */
function getStreamersSnapshot(userId: string): RTMPStreamerSnapshot {
  const languageStreamers = activeStreamers.get(userId);
  if (!languageStreamers || languageStreamers.size === 0) {
    return { active: false, channels: [] };
  }
  return mergeSnapshots(
    Array.from(languageStreamers.values()).map((streamer) => streamer.getSnapshot())
  );
}
```

- [ ] **Step 4: Update the go-live restart check**

`server.ts:966-970`:
```ts
// before
    if (activeStreamers.has(userId)) {
      logger.warn({ userId }, "handleGoLive: stopping existing streamer before restart");
      activeStreamers.get(userId)!.stop();
      activeStreamers.delete(userId);
    }
// after
    if (activeStreamers.has(userId)) {
      logger.warn({ userId }, "handleGoLive: stopping existing streamers before restart");
      stopStreamersForUser(userId);
    }
```

- [ ] **Step 5: Replace the single streamer start with per-language streamers**

Replace `server.ts:1006-1069` (the "Initialize RTMP Streamer" block through the `} else { ... "No RTMP" }` close) with:
```ts
    // ── Initialize RTMP Streamers ─────────────────────────────────────
    // Build RTMP configs from channels that have both rtmpUrl and rtmpKey
    const rtmpConfigs: ChannelRTMPConfig[] = [];
    for (const ch of channels) {
      const chAny = ch as any;
      if (chAny.rtmpUrl && chAny.rtmpKey) {
        // Decrypt RTMP key if it looks encrypted (contains ":" separators)
        let rtmpKey = chAny.rtmpKey;
        if (rtmpKey.includes(":")) {
          const decrypted = decryptValue(rtmpKey);
          if (decrypted) rtmpKey = decrypted;
        }

        rtmpConfigs.push({
          channelId: chAny._id.toString(),
          languageId: chAny.languageId,
          languageName: chAny.languageName,
          rtmpUrl: chAny.rtmpUrl,
          rtmpKey,
        });
      }
    }

    // Group configs by language — one RTMPStreamer (one FFmpeg) per language
    // so each destination receives only its own language's audio.
    const configsByLanguage = new Map<string, ChannelRTMPConfig[]>();
    for (const config of rtmpConfigs) {
      const group = configsByLanguage.get(config.languageId);
      if (group) group.push(config);
      else configsByLanguage.set(config.languageId, [config]);
    }

    // Start RTMP streamers if any channels have RTMP configs
    if (configsByLanguage.size > 0) {
      const languageStreamers = new Map<string, RTMPStreamer>();
      const ingestUrl = `rtmp://localhost:1935/live/${userId}`;

      for (const [languageId, configs] of configsByLanguage) {
        const streamer = new RTMPStreamer();

        // Listen for streamer events
        streamer.on("error", (err: Error) => {
          logger.error({ err: err.message, userId, languageId }, "RTMP streamer error");
          sendToClient(ws, {
            type: "RTMP_ERROR",
            error: err.message,
          });
        });

        streamer.on("stopped", () => {
          logger.info({ userId, languageId }, "RTMP stopped");
        });

        streamer.on("channel-error", (channelId: string, error: string) => {
          sendToClient(ws, {
            type: "RTMP_CHANNEL_ERROR",
            channelId,
            error,
          });
        });

        const started = streamer.start(configs, ingestUrl);
        if (started) {
          languageStreamers.set(languageId, streamer);
          logger.info({ userId, languageId, destinations: configs.length }, "RTMP streamer started");
        } else {
          logger.warn({ userId, languageId }, "RTMP streamer failed to start");
          streamer.stop();
        }
      }

      if (languageStreamers.size > 0) {
        activeStreamers.set(userId, languageStreamers);
        // Update stream stage
        sessionManager.updateStage(userId, "stream", "active", "Connecting...");
      } else {
        sessionManager.updateStage(userId, "stream", "error", "FFmpeg failed");
      }
    } else {
      logger.info({ userId }, "Pipeline-only mode");
      sessionManager.updateStage(userId, "stream", "idle", "No RTMP");
    }
```

- [ ] **Step 6: Route TTS outputs per language in the chunk pipeline**

Replace `server.ts:313-330` (the "Push TTS audio to RTMP streamer" block through its `}` after the `sessionManager.updateStage` call) with:
```ts
  // 5. Push TTS audio to RTMP streamers (one per language)
  const languageStreamers = activeStreamers.get(userId);

  // Auto-tune the output delay for every language streamer so each voice
  // trails the picture by a constant offset (pipeline latency + headroom).
  if (languageStreamers && result.timings?.total) {
    for (const streamer of languageStreamers.values()) {
      streamer.setTargetDelay(result.timings.total);
    }
  }

  if (languageStreamers && result.ttsOutputs.length > 0) {
    const payloadsByLanguage = groupTTSPayloadsByLanguage(result.ttsOutputs);
    let pushedCount = 0;
    for (const [languageId, payloads] of payloadsByLanguage) {
      const streamer = languageStreamers.get(languageId);
      if (!streamer?.active) continue;
      for (const payload of payloads) {
        streamer.pushAudio(payload.audioBase64, captureTime);
        pushedCount++;
      }
    }
    if (pushedCount > 0) {
      sessionManager.updateStage(userId, "stream", "done", `${pushedCount} ch`);
    }
  }
```

- [ ] **Step 7: Update the three SESSION_SNAPSHOT pushes**

Replace all three occurrences of this pattern (`server.ts:359-364`, `server.ts:708-713`, `server.ts:740-745`):
```ts
// before (each site has the same shape, different indentation)
        const rtmpSnap = activeStreamers.get(userId)?.getSnapshot();
        sendToClient(ws, {
          type: "SESSION_SNAPSHOT",
          ...sessionManager.getSnapshot(userId),
          rtmp: rtmpSnap || { active: false, channels: [] },
        });
// after
        const rtmpSnap = getStreamersSnapshot(userId);
        sendToClient(ws, {
          type: "SESSION_SNAPSHOT",
          ...sessionManager.getSnapshot(userId),
          rtmp: rtmpSnap,
        });
```
(Note: at `server.ts:359-364` the variable is `rtmpSnapshot` and indentation is 2 spaces; keep each site's existing variable name/indentation — the change is only the source of `rtmp*` and dropping the `|| { active: false, channels: [] }` fallback, since `getStreamersSnapshot` already returns that shape when idle.)

- [ ] **Step 8: Replace the four stop paths**

Replace each of the four `activeStreamers.get(userId)` + `streamer.stop()` + `delete` blocks with one call. Keep each site's surrounding `if` context:

`server.ts:600-603` (inside `donePublish`, after `if (ws && sessionManager.isActive(userId)) {`):
```ts
        const streamer = activeStreamers.get(userId);
        if (streamer) {
          streamer.stop();
          activeStreamers.delete(userId);
        }
```
→
```ts
        stopStreamersForUser(userId);
```

`server.ts:778-781` (inside `OBS_DISCONNECTED`, 12-space indent):
```ts
            const streamer = activeStreamers.get(userId);
            if (streamer) {
              streamer.stop();
              activeStreamers.delete(userId);
            }
```
→
```ts
            stopStreamersForUser(userId);
```

`server.ts:803-806` (inside `STOP_STREAM`, 10-space indent):
```ts
          const streamer = activeStreamers.get(userId);
          if (streamer) {
            streamer.stop();
            activeStreamers.delete(userId);
          }
```
→
```ts
          stopStreamersForUser(userId);
```

`server.ts:861-864` (inside `ws.on("close")`, 6-space indent):
```ts
      const streamer = activeStreamers.get(userId);
      if (streamer) {
        streamer.stop();
        activeStreamers.delete(userId);
      }
```
→
```ts
      stopStreamersForUser(userId);
```

- [ ] **Step 9: Update the stale cleanup loop**

`server.ts:893-897`:
```ts
// before
    for (const [userId] of activeStreamers.entries()) {
      if (!sessionManager.isActive(userId)) {
        activeStreamers.delete(userId);
        logger.debug({ userId }, "Cleaned up stale streamer");
      }
    }
// after
    for (const [userId] of activeStreamers.entries()) {
      if (!sessionManager.isActive(userId)) {
        stopStreamersForUser(userId);
        logger.debug({ userId }, "Cleaned up stale streamer");
      }
    }
```

- [ ] **Step 10: Update the graceful shutdown loop**

`server.ts:913-916`:
```ts
// before
    for (const [userId, streamer] of activeStreamers.entries()) {
      logger.info({ userId }, "Stopping RTMP streamer");
      streamer.stop();
    }
// after
    for (const [userId] of activeStreamers.entries()) {
      logger.info({ userId }, "Stopping RTMP streamers");
      stopStreamersForUser(userId);
    }
```

- [ ] **Step 11: Update the SESSION_STARTED snapshot**

`server.ts:1074-1080`:
```ts
// before
    const rtmpSnap = activeStreamers.get(userId)?.getSnapshot();
    sendToClient(ws, {
      type: "SESSION_STARTED",
      languages,
      ...sessionManager.getSnapshot(userId),
      rtmp: rtmpSnap || { active: false, channels: [] },
    });
// after
    const rtmpSnap = getStreamersSnapshot(userId);
    sendToClient(ws, {
      type: "SESSION_STARTED",
      languages,
      ...sessionManager.getSnapshot(userId),
      rtmp: rtmpSnap,
    });
```

- [ ] **Step 12: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `sendToClient` is called with `ws` possibly `undefined` in a helper context, verify no new errors — `sendToClient` already accepts `WebSocket | undefined`.)

- [ ] **Step 13: Run the test suite**

Run: `npx vitest run`
Expected: PASS — all tests including Task 1's `channel-routing.test.ts`.

- [ ] **Step 14: Build**

Run: `npm run build`
Expected: `next build` completes successfully.

- [ ] **Step 15: Commit**

```bash
git add server.ts
git commit -m "feat(stream): isolate audio per language with one RTMP streamer per language"
```

---

### Task 3: Live verification on the VM (manual, user-gated)

**Files:** none.

- [ ] **Step 1: Deploy**

On the VM, or via the auto-deploy cron:
```bash
cd ~/vaani && git pull && ./scripts/auto-deploy.sh
```

- [ ] **Step 2: Watch memory during a 3-language test stream**

Run: on the VM, `free -m` at ~2 min and again ~10 min into a 3-language stream.
Expected: steady, no swap thrash; consistent with the ~600–750 MB budget.

- [ ] **Step 3: Confirm per-language isolation**

With OBS live and 2+ languages enabled, listen to each destination separately (YouTube/Twitch test streams). Expected: each destination carries **only its own language's** translation, never a mix.

- [ ] **Step 4: Failure drill**

Kill or block one destination's URL mid-stream. Expected: that language's streamer restarts (existing retry logic) while the other languages continue uninterrupted.

- [ ] **Step 5: Regression**

Restart with a single language enabled. Expected: identical to pre-change behavior.

---

## Self-Review

**1. Spec coverage:** The spec's Data Flow (group configs by language → one streamer each → route ttsOutputs via `LANG_BY_BCP47` → apply `setTargetDelay` per streamer → stop all → aggregate snapshots) maps 1:1 to Task 2 Steps 5, 6, 3, 8-11. Error handling (TTS fail → silent gap; destination fail → per-language restart; no streamer for language → skip) is Task 2 Step 6 + unchanged class behavior. Verification (memory, isolation, failure drill, regression) is Task 3. The "rtmp-streamer.ts unchanged" constraint is honored — no task touches it.

**2. Placeholder scan:** No TBD/TODO; every step has complete code or an exact command with expected output.

**3. Type consistency:** `TTSOutputForRouting` (Task 1) matches `TTSResult` (`{ audioBase64: string; targetLanguage: string }`) structurally, so `groupTTSPayloadsByLanguage(result.ttsOutputs)` in Task 2 Step 6 type-checks. `mergeSnapshots` returns `RTMPStreamerSnapshot`, and `getStreamersSnapshot` (Task 2 Step 3) returns the same type — consistent at every snapshot call site. `stopStreamersForUser` and `getStreamersSnapshot` names are used identically in Steps 3-11.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-08-per-channel-isolation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh implementer subagent per task (using ruflo `ruflo-core:coder` for implementation and `ruflo-core:reviewer` for review, per your request), with a review between tasks.

**2. Inline Execution** — execute tasks in this session using executing-plans.

Which approach?
