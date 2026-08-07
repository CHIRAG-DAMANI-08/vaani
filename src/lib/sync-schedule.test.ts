import { describe, it, expect } from "vitest";
import { computePumpWrite, smoothDelay, drainDue } from "./sync-schedule";

describe("computePumpWrite", () => {
  it("writes 4800 bytes for 100ms elapsed", () => {
    expect(computePumpWrite(100, 0)).toEqual({ bytesToWrite: 4800, bytesTarget: 0 });
  });

  it("drains the accumulated backlog when elapsed is zero", () => {
    expect(computePumpWrite(0, 1000)).toEqual({ bytesToWrite: 1000, bytesTarget: 0 });
  });

  it("returns a negative write for negative elapsed (caller guards the <= 0 case)", () => {
    expect(computePumpWrite(-50, 100)).toEqual({ bytesToWrite: -2300, bytesTarget: 0 });
  });

  it("carries a sub-byte remainder", () => {
    const r = computePumpWrite(50.2, 0);
    expect(r.bytesToWrite).toBe(2409);
    expect(r.bytesTarget).toBeCloseTo(0.6, 10); // float noise: 0.6000000000003638
  });

  it("caps at 9600 bytes per tick and carries the excess", () => {
    expect(computePumpWrite(500, 0)).toEqual({ bytesToWrite: 9600, bytesTarget: 14400 });
  });
});

describe("smoothDelay", () => {
  it("returns measured + 500ms headroom on the first call (current === 0)", () => {
    expect(smoothDelay(0, 3500)).toBe(4000);
  });

  it("blends 70% current / 30% target in steady state", () => {
    expect(smoothDelay(4000, 5000)).toBe(4450); // 0.7*4000 + 0.3*5500
  });

  it("clamps to the minimum delay", () => {
    expect(smoothDelay(0, 100)).toBe(2000); // 600 → clamped to 2000
  });

  it("clamps to the maximum delay", () => {
    expect(smoothDelay(8000, 8000)).toBe(8000); // 8500 → clamped to 8000
  });
});

describe("drainDue", () => {
  const P = (targetTime: number, pcm: string) => ({ targetTime, pcm });

  it("keeps not-yet-due chunks pending", () => {
    const pending = [P(3000, "a")];
    expect(drainDue(pending, 2999, 1500)).toEqual({ due: [], dropped: 0 });
    expect(pending).toHaveLength(1);
  });

  it("releases chunks at their target time", () => {
    expect(drainDue([P(3000, "a")], 3000, 1500).due.map((x) => x.pcm)).toEqual(["a"]);
  });

  it("drops chunks more than tolerance late", () => {
    const pending = [P(1000, "a")];
    expect(drainDue(pending, 2600, 1500)).toEqual({ due: [], dropped: 1 });
    expect(pending).toHaveLength(0);
  });

  it("plays chunks within tolerance", () => {
    expect(drainDue([P(1000, "a")], 2000, 1500).due.map((x) => x.pcm)).toEqual(["a"]);
  });

  it("releases in order across multiple target times", () => {
    const pending = [P(3000, "a"), P(6000, "b"), P(9000, "c")];
    expect(drainDue(pending, 4500, 1500).due.map((x) => x.pcm)).toEqual(["a"]);
    expect(pending).toHaveLength(2);
    expect(drainDue(pending, 7000, 1500).due.map((x) => x.pcm)).toEqual(["b"]);
    expect(pending).toHaveLength(1);
  });

  it("handles an empty list", () => {
    expect(drainDue([], 5000, 1500)).toEqual({ due: [], dropped: 0 });
  });
});
