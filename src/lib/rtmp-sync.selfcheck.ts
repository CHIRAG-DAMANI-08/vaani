// Self-check for the jitter-buffer scheduling policy (drainDue).
// Run: npx tsx src/lib/rtmp-sync.selfcheck.ts
import assert from "node:assert";
import { drainDue, type PendingChunk } from "./rtmp-streamer";

type Item = { pcm: string };
const P = (targetTime: number, pcm: string): PendingChunk<Item> => ({ targetTime, pcm });

// 1. A chunk scheduled at t=3000 is NOT released before its time.
const notDue = [P(3000, "a")];
assert.deepStrictEqual(drainDue(notDue, 2999, 1500), { due: [], dropped: 0 });
assert.strictEqual(notDue.length, 1, "not-yet-due chunk stays pending");

// 2. On time → released.
const onTime = [P(3000, "a")];
assert.deepStrictEqual(drainDue(onTime, 3000, 1500).due.map((x) => x.pcm), ["a"]);

// 3. Chunk pushed when its window already passed by >1.5s → dropped, not played.
const late = [P(1000, "a")];
assert.deepStrictEqual(drainDue(late, 2600, 1500), { due: [], dropped: 1 });

// 4. Arrived 1s late (within tolerance) → still played.
const sloppy = [P(1000, "a")];
assert.deepStrictEqual(drainDue(sloppy, 2000, 1500).due.map((x) => x.pcm), ["a"]);

// 5. Ordered release across chunks with different target times.
const seq = [P(3000, "a"), P(6000, "b"), P(9000, "c")];
assert.deepStrictEqual(drainDue(seq, 4500, 1500).due.map((x) => x.pcm), ["a"]);
assert.strictEqual(seq.length, 2, "future chunks remain pending");
assert.deepStrictEqual(drainDue(seq, 7000, 1500).due.map((x) => x.pcm), ["b"]);
assert.strictEqual(seq.length, 1);

console.log("rtmp-sync.selfcheck OK — jitter-buffer policy holds.");
